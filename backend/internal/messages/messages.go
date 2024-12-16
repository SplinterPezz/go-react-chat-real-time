package messages

import (
	"backend/internal/auth"
	"backend/internal/models"
	"backend/internal/utils"
	"backend/mongodb"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Broadcast job for sending messages
type broadcastJob struct {
	message interface{}
	conn    *websocket.Conn
}

// Broadcast queue with buffer
var broadcastQueue = make(chan broadcastJob, 1000)

// ClientInfo stores multiple WebSocket connections for a single user
type ClientInfo struct {
	mu          sync.RWMutex
	Connections map[string]*websocket.Conn
}

const (
	ConnectionStatusConnect    = "connect"
	ConnectionStatusDisconnect = "disconnect"
)

// New struct for connection status message
type ConnectionStatusMessage struct {
	Type        string                 `json:"type"`
	OnlineUsers []*models.UserResponse `json:"online_users"`
}

// Clients map to store multiple connections per user
var clients = sync.Map{}

// GenerateUniqueID creates a cryptographically secure unique identifier
func GenerateUniqueID() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		// Fallback to timestamp if random generation fails
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return base64.URLEncoding.EncodeToString(b)
}

// AddConnection adds a new WebSocket connection for a user
func (ci *ClientInfo) AddConnection(clientID string, conn *websocket.Conn) {
	ci.mu.Lock()
	defer ci.mu.Unlock()
	if ci.Connections == nil {
		ci.Connections = make(map[string]*websocket.Conn)
	}
	ci.Connections[clientID] = conn
}

// RemoveConnection removes a specific WebSocket connection for a user
func (ci *ClientInfo) RemoveConnection(clientID string) {
	ci.mu.Lock()
	defer ci.mu.Unlock()
	delete(ci.Connections, clientID)
}

// GetConnections returns all connections for a user
func (ci *ClientInfo) GetConnections() map[string]*websocket.Conn {
	ci.mu.RLock()
	defer ci.mu.RUnlock()
	return ci.Connections
}

// IsEmpty checks if the user has no active connections
func (ci *ClientInfo) IsEmpty() bool {
	ci.mu.RLock()
	defer ci.mu.RUnlock()
	return len(ci.Connections) == 0
}

// Initialize broadcast workers
func init() {
	// Start workers based on available CPU cores
	numWorkers := runtime.NumCPU()
	for i := 0; i < numWorkers; i++ {
		go broadcastWorker()
	}
}

// Broadcast worker to send messages
func broadcastWorker() {
	log.Println("Broadcasting worker started...")
	for job := range broadcastQueue {
		if err := job.conn.WriteJSON(job.message); err != nil {
			if websocket.IsUnexpectedCloseError(err) {
				log.Printf("Connection closed unexpectedly: %v", err)
				continue
			}
			log.Println("Error broadcasting message:", err)
		}
	}
}

// HandleWebSocket manages WebSocket connection for users
func HandleWebSocket(c *gin.Context) {
	// Generate a unique client ID for this connection
	clientID := GenerateUniqueID()
	log.Println("ClientID", clientID)
	// Retrieve token from request
	token := utils.RetriveTokenFromRequestHttp(c)

	// Token retrieval logic
	if token == nil || *token == "" {
		// Try query parameter
		tokenFromQuery := c.DefaultQuery("token", "")
		if tokenFromQuery != "" {
			token = &tokenFromQuery
		} else {
			// Try cookies
			cookieToken, err := c.Cookie("auth_token")
			if err == nil && cookieToken != "" {
				token = &cookieToken
			}
		}
	}

	// Validate token
	if token == nil || *token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Authorization token is required"})
		return
	}

	// Authenticate user
	user, err := auth.GetUserFromToken(*token)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not authorized"})
		return
	}

	// Upgrade to WebSocket connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Error upgrading websocket connection: %v\n", err)
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	// Retrieve or create ClientInfo for the user
	clientInfoRaw, _ := clients.LoadOrStore(user.ID, &ClientInfo{})
	clientInfo := clientInfoRaw.(*ClientInfo)

	// Add this specific connection to the user's connections
	clientInfo.AddConnection(clientID, conn)

	// Broadcasting message on Connection User
	broadcastConnectionStatus(ConnectionStatusConnect)

	// Start message handling goroutine
	go handleMessages(user.ID, clientID, conn)
}

// handleMessages processes incoming WebSocket messages
func handleMessages(userID, clientID string, conn *websocket.Conn) {
	defer func() {
		// Retrieve the client info
		clientInfoRaw, ok := clients.Load(userID)
		if !ok {
			return
		}
		clientInfo := clientInfoRaw.(*ClientInfo)

		// Remove this specific connection
		clientInfo.RemoveConnection(clientID)

		// If no more connections, remove the user from clients
		if clientInfo.IsEmpty() {
			clients.Delete(userID)
			log.Printf("Broadcasting connection status disconnect")
			broadcastConnectionStatus(ConnectionStatusDisconnect)
		}

		// Close the connection if it's still open
		if conn != nil {
			err := conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
			if err != nil {
				log.Printf("Error sending close frame for user %s: %v", userID, err)
			}
			conn.Close()
		}
	}()

	for {
		// Read raw message first
		_, p, err := conn.ReadMessage() // Read the raw message bytes
		log.Printf("Raw JSON message received: %s", p)
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Printf("Connection closed for user %s: %v", userID, err)
				break
			}
			log.Printf("Error reading message from user %s: %v", userID, err)
			break
		}

		// Log the raw JSON message to inspect it
		log.Printf("Raw JSON message received: %s", p)

		// Now unmarshal the raw JSON into your message struct
		var message models.Message
		err = json.Unmarshal(p, &message)
		if err != nil {
			log.Printf("Error unmarshalling JSON for user %s: %v", userID, err)
			break
		}

		// Process the message
		message.SentAt = time.Now()
		message.Sender = userID
		messageType := "message"
		message.Type = &messageType

		// Broadcast the message to other users in the chat
		log.Printf("Broadcasting message from user %s in chat %s", userID, message.ChatID)
		broadcastMessageToChat(message.ChatID, message)
	}
}

func broadcastConnectionStatus(statusType string) {
	// Get online users
	var userIDs []string

	// Collect online user IDs
	clients.Range(func(key, value interface{}) bool {
		userID, ok := key.(string)
		if !ok {
			log.Println("Error: Invalid key type")
			return true
		}
		userIDs = append(userIDs, userID)
		return true
	})

	// Retrieve user details
	var onlineUsers []*models.UserResponse
	if len(userIDs) > 0 {
		onlineUsers, _ = mongodb.GetUserByIds(userIDs)
		log.Printf("%d", len(onlineUsers))
		if onlineUsers == nil {
			log.Printf("Error retrieving online users")
			return
		}
	}

	// Prepare connection status message
	connectionStatus := ConnectionStatusMessage{
		Type:        statusType,
		OnlineUsers: onlineUsers,
	}

	// Broadcast to all connected clients
	clients.Range(func(key, value interface{}) bool {
		clientInfo := value.(*ClientInfo)

		// Get all connections for this user
		connections := clientInfo.GetConnections()

		// Broadcast to all of the user's connections
		for _, conn := range connections {
			broadcastQueue <- broadcastJob{
				message: connectionStatus,
				conn:    conn,
			}
		}

		return true
	})
}

// broadcastMessageToChat sends a message to all users in a specific chat
func broadcastMessageToChat(chatID string, message models.Message) {
	// Get all users in the chat
	chat, err := mongodb.GetChatByIdAndSender(chatID, message.Sender)
	if err != nil || chat == nil {
		log.Printf("Error retrieving users for chat %s: %v", chatID, err)
		return
	}

	filteredUsers := []string{}
	for _, user := range chat.Users {
		if user != message.Sender {
			filteredUsers = append(filteredUsers, user)
		}
	}

	if len(filteredUsers) == 0 {
		log.Printf("Error retrieving users for chat %s, something went wrong, no users in chat.", chatID)
		return
	}

	usersInChat, err := mongodb.GetUserByIds(filteredUsers)
	if err != nil || usersInChat == nil || len(usersInChat) == 0 {
		log.Printf("Error retrieving users for chat %s, something went wrong, no users in chat found on DB.", chatID)
		return
	}

	// Save the message
	savedMessage, err := mongodb.SaveMessage(&message)
	if err != nil || savedMessage == nil {
		log.Printf("Error saving message from user %s: %v", message.Sender, err)
		return
	}

	// Update chat details
	timeNow := time.Now()
	chat.LastMessage = &savedMessage.Content
	chat.LastMessageBy = &savedMessage.Sender
	chat.LastMessageAt = &timeNow
	chat.LastMessageId = &savedMessage.ID
	chat.CountMessages += 1
	if err := mongodb.UpdateChat(chat); err != nil {
		log.Printf("Error updating chat %s: %v", message.Sender, err)
		return
	}

	// Map of userIDs in the chat for fast lookup
	userIDsInChat := make(map[string]struct{}, len(chat.Users))
	for _, userID := range chat.Users {
		userIDsInChat[userID] = struct{}{}
	}

	// Broadcast to all clients of users in the chat
	clients.Range(func(key, value interface{}) bool {
		userID := key.(string)

		// Check if this user is in the chat
		if _, exists := userIDsInChat[userID]; exists {
			// Get the client info for this user
			clientInfo := value.(*ClientInfo)

			// Get all connections for this user
			connections := clientInfo.GetConnections()

			// Broadcast to all of the user's connections
			for _, conn := range connections {
				broadcastQueue <- broadcastJob{
					message: message,
					conn:    conn,
				}
			}
		}

		return true
	})
}

func isUserInChat(userID, chatID string) bool {
	// This function checks if a user is part of the chat (using chatID and userID)
	chat, err := mongodb.FindUserChat(chatID, userID)
	return err == nil && chat != nil
}

func GetChats(c *gin.Context) {
	token := utils.RetriveTokenFromRequestHttp(c)

	user, err_user := auth.GetUserFromToken(*token)
	if err_user != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not authorized"})
		return
	}

	chats, err_chats := mongodb.GetUserChatsWithMessages(user.ID)
	if err_chats != nil || chats == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("Something went wrong: %v", err_chats)})
		return
	}

	if len(chats) == 0 {
		c.JSON(http.StatusOK, chats)
		return
	}

	err := setUsersDataMultipleChats(user.ID, chats)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("Something went wrong: %v", err)})
		return
	}

	c.JSON(http.StatusOK, chats)
}

func GetChatsById(c *gin.Context) {
	token := utils.RetriveTokenFromRequestHttp(c)

	user, err_user := auth.GetUserFromToken(*token)
	if err_user != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not authorized"})
		return
	}

	chatID := c.DefaultQuery("chat_id", "")
	if chatID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "chat_id is required"})
		return
	}

	chat, err_chats := mongodb.GetUserChatById(user.ID, chatID)
	if err_chats != nil || chat == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("Something went wrong: %v", err_chats)})
		return
	}

	err := setUsersDataSingleChat(user.ID, chat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("Something went wrong: %v", err)})
		return
	}

	c.JSON(http.StatusOK, chat)
}

func setUsersDataSingleChat(userId string, chat *models.Chat) error {
	userIDSet := make(map[string]struct{})
	for _, uid := range chat.Users {
		if uid != userId {
			userIDSet[uid] = struct{}{}
		}
	}

	userIDs := make([]string, 0, len(userIDSet))
	for uid := range userIDSet {
		userIDs = append(userIDs, uid)
	}

	userResponses, err := mongodb.GetUserByIds(userIDs)
	if err != nil {
		return fmt.Errorf("failed to get user responses: %w", err)
	}

	// Create a map for quick lookup of UserResponse by user ID
	userResponseMap := make(map[string]*models.UserResponse)
	for _, userResponse := range userResponses {
		userResponseMap[userResponse.ID] = userResponse
	}

	for _, uid := range chat.Users {
		if userResponse, exists := userResponseMap[uid]; exists {
			chat.UserData = userResponse
			break
		}
	}

	return nil
}

func setUsersDataMultipleChats(userId string, chats []*models.Chat) error {
	// Create a set (map) to store unique user IDs from all chats
	userIDSet := make(map[string]struct{})

	// Collect distinct user IDs from each chat's Users list, excluding the provided userId
	for _, chat := range chats {
		for _, uid := range chat.Users {
			if uid != userId {
				userIDSet[uid] = struct{}{}
			}
		}
	}

	// Convert the set of user IDs to a slice
	userIDs := make([]string, 0, len(userIDSet))
	for uid := range userIDSet {
		userIDs = append(userIDs, uid)
	}

	// Call the MongoDB function to get user details for the collected user IDs
	userResponses, err := mongodb.GetUserByIds(userIDs)
	if err != nil {
		return fmt.Errorf("failed to get user responses: %w", err)
	}

	// Create a map for quick lookup of UserResponse by user ID
	userResponseMap := make(map[string]*models.UserResponse)
	for _, userResponse := range userResponses {
		userResponseMap[userResponse.ID] = userResponse
	}

	// Update each chat's usersData with the UserResponse objects
	for _, chat := range chats {
		for _, uid := range chat.Users {
			if userResponse, exists := userResponseMap[uid]; exists {
				chat.UserData = userResponse
				break
			}
		}
	}

	return nil
}

func GetMessageChat(c *gin.Context) {
	token := utils.RetriveTokenFromRequestHttp(c)
	user, err := auth.GetUserFromToken(*token)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not authorized"})
		return
	}

	chatID := c.DefaultQuery("chat_id", "")
	if chatID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "chat_id is required"})
		return
	}

	chat, err := mongodb.GetChatByIdAndSender(chatID, user.ID)
	if err != nil || chat == nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "There are no chat with this ID or ID is malformed"})
		return
	}

	limitQuery := c.DefaultQuery("limit", "20")
	pageQuery := c.DefaultQuery("page", "1")

	limit, err := strconv.Atoi(limitQuery)
	if err != nil || limit <= 0 || limit >= 100 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid limit value. Limit should be > 0 and < 100."})
		return
	}

	page, err := strconv.Atoi(pageQuery)
	if err != nil || page <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid page value. Page should be > 0."})
		return
	}

	messages, total_pages, err := mongodb.GetChatMessages(chatID, limit, page)
	if err != nil || messages == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "There are no messages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages, "total_pages": total_pages})
}

func CreateChat(c *gin.Context) {
	token := utils.RetriveTokenFromRequestHttp(c)
	user, err := auth.GetUserFromToken(*token)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not authorized"})
		return
	}

	var payload struct {
		UserID string `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid input"})
		return
	}

	if len(payload.UserID) == 0 || payload.UserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "UserId cannot be empty!"})
		return
	}

	if user.ID == payload.UserID {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Cannot create a chat with yourself! How are you here?! Stop use POSTMAN"})
		return
	}

	//Check if user exists
	user_to_invite, err := mongodb.FindUserById(payload.UserID)
	if err != nil || user_to_invite == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Cannot find User to create chat with!"})
		return
	}

	// Check if chat already exists
	existingChat, err := mongodb.FindChatByUsers([]string{user.ID, payload.UserID})
	if err == nil && existingChat != nil {
		setUsersDataSingleChat(user.ID, existingChat)
		c.JSON(http.StatusOK, existingChat)
		return
	}

	// Create a new Chat
	newChat := &models.Chat{
		Users:         []string{user.ID, payload.UserID},
		CountMessages: 0,
		CreatedBy:     user.ID,
		CreatedAt:     time.Now(),
	}

	newChat, err = mongodb.CreateChat(newChat)
	if err != nil || newChat == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create chat"})
		return
	}

	setUsersDataSingleChat(user.ID, newChat)
	c.JSON(http.StatusCreated, newChat)
}

// OnlineUsers returns a list of currently connected users
func OnlineUsers(c *gin.Context) {
	token := utils.RetriveTokenFromRequestHttp(c)

	user, err_user := auth.GetUserFromToken(*token)
	if err_user != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not authorized"})
		return
	}

	var userIDs []string

	// Iterate over the clients map and collect user IDs
	clients.Range(func(key, value interface{}) bool {
		userID, ok := key.(string)
		if !ok {
			log.Println("Error: Invalid key type")
			return true
		}

		// Add all users connected except the user themselves
		if user.ID != userID {
			userIDs = append(userIDs, userID)
		}

		return true
	})

	if len(userIDs) > 0 {
		users, err := mongodb.GetUserByIds(userIDs)
		if err != nil || users == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong on getUsersOnline"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"online_users": users,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"online_users": []models.UserResponse{},
	})
}

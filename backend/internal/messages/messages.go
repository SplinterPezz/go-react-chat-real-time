package messages

import (
	"backend/internal/auth"
	"backend/internal/models"
	"backend/internal/utils"
	"backend/mongodb"
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
var clients sync.Map

func OnlineUsers(c *gin.Context) {
	token := utils.RetriveTokenFromRequestHttp(c)

	user, err_user := auth.GetUserFromToken(*token)
	if err_user != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not authorized"})
		return
	}

	// Print a message with the number of online users
	var userIDs []string

	// Iterate over the clients map and collect user IDs
	clients.Range(func(key, value interface{}) bool {
		userID, ok := key.(string)
		if !ok {
			log.Println("Error: Invalid key type")
			return true
		}

		//add all users connected except user himself
		if user.ID != userID {
			// Add the userID to the slice
			userIDs = append(userIDs, userID)
		}

		// Continue iterating
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

func HandleWebSocket(c *gin.Context) {
	token := utils.RetriveTokenFromRequestHttp(c) // token is of type *string

	if token == nil || *token == "" {
		// Try to get the token from the query parameter
		tokenFromQuery := c.DefaultQuery("token", "")
		if tokenFromQuery != "" {
			token = &tokenFromQuery
		} else {
			// Try to get the token from cookies
			cookieToken, err := c.Cookie("auth_token")
			if err == nil && cookieToken != "" {
				token = &cookieToken
			}
		}
	}

	if token == nil || *token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Authorization token is required"})
		return
	}

	user, err := auth.GetUserFromToken(*token)
	log.Println(user.Username)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not authorized"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		// panic(err)
		log.Printf("%s, error while Upgrading websocket connection\n", err.Error())
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	clients.Store(user.ID, conn)

	// Start a separate goroutine to handle messages for this client
	go handleMessages(user.ID, conn)
}

func handleMessages(userID string, conn *websocket.Conn) {
	defer func() {
		log.Printf("Removing client %s from the connected users list due to disconnection", userID)
		clients.Delete(userID)

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

		// Log the deserialized message
		log.Printf("Received message from user %s: %+v", userID, message)

		// Process the message (save it and broadcast it)
		message.SentAt = time.Now()
		message.Sender = userID

		// Broadcast the message to other users in the chat
		log.Printf("Broadcasting message from user %s in chat %s", userID, message.ChatID)
		broadcastMessageToChat(message.ChatID, message)
	}
}

type broadcastJob struct {
	message models.Message
	conn    *websocket.Conn
}

var broadcastQueue = make(chan broadcastJob, 1000)

func init() {
	// Start workers based on available CPU cores
	numWorkers := runtime.NumCPU()
	for i := 0; i < numWorkers; i++ {
		go broadcastWorker() // Start each worker as a goroutine
	}
}

func broadcastWorker() {
	log.Printf("Broadcasting worker started . . .")
	count := 0
	for job := range broadcastQueue {
		count++
		log.Printf("Broadcasting worker count: %d", count)
		if err := job.conn.WriteJSON(job.message); err != nil {
			if websocket.IsUnexpectedCloseError(err) {
				log.Printf("Connection closed unexpectedly: %v", err)
				continue
			}
			log.Println("Error broadcasting message:", err)
		}
	}
}

func broadcastMessageToChat(chatID string, message models.Message) {
	// Get all users in the chat
	chat, err := mongodb.GetChatByIdAndSender(chatID, message.Sender)
	if err != nil || chat == nil {
		log.Printf("Error retrieving users for chat %s: %v", chatID, err)
		return
	}

	if message, err := mongodb.SaveMessage(&message); err != nil || message == nil {
		log.Printf("Error saving message from user %s: %v", message.Sender, err)
		return
	}

	chat.LastMessage = message.Content
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

	// For each connected client, check if they are in the chat
	clients.Range(func(key, value interface{}) bool {
		conn := value.(*websocket.Conn)
		userID := key.(string)

		// If the user is part of the chat, send the message
		if _, exists := userIDsInChat[userID]; exists {
			// Enqueue the message to be broadcasted to this user
			broadcastQueue <- broadcastJob{
				message: message,
				conn:    conn,
			}
		}

		// Continue to the next client
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

	chats, err_chats := mongodb.GetUserChats(user.ID)
	if err_chats != nil || chats == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("Something went wrong: %v", err_chats)})
		return
	}

	c.JSON(http.StatusOK, chats)
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
	if err != nil || limit <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid limit value"})
		return
	}

	page, err := strconv.Atoi(pageQuery)
	if err != nil || page <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid page value"})
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

	c.JSON(http.StatusCreated, newChat)
}

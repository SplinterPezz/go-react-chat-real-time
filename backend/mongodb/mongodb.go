package mongodb

import (
	"backend/internal/models"
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Global variable to hold the MongoDB client
var Client *mongo.Client
var usersCollection *mongo.Collection
var chatsCollection *mongo.Collection
var messagesCollection *mongo.Collection

// InitMongoDB initializes the MongoDB connection and assigns it to the global Client variable
func InitMongoDB() {
	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Get MongoDB connection details from environment variables
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI is not set in environment variables")
	}

	mongoUser := os.Getenv("MONGO_USER")
	mongoPassword := os.Getenv("MONGO_PASSWORD")

	// Set up client options
	clientOptions := options.Client().ApplyURI(mongoURI)

	// If authentication is required, set up the credentials
	if mongoUser != "" && mongoPassword != "" {
		clientOptions.SetAuth(options.Credential{
			Username: mongoUser,
			Password: mongoPassword,
		})
	}

	// Attempt to connect to MongoDB
	var errConnect error
	Client, errConnect = mongo.Connect(context.Background(), clientOptions)
	if errConnect != nil {
		log.Fatal("Failed to connect to MongoDB:", errConnect)
	}

	// Ping MongoDB to ensure the connection is established
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err = Client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Failed to ping MongoDB:", err)
	}

	// Select the database and initialize the usersCollection
	dbName := os.Getenv("DB_NAME") // Get the database name from environment variable
	if dbName == "" {
		log.Fatal("DB_NAME is not set in environment variables")
	}

	usersCollection = Client.Database(dbName).Collection("users")       // Set the users collection
	chatsCollection = Client.Database(dbName).Collection("chats")       // Set the chats collection
	messagesCollection = Client.Database(dbName).Collection("messages") // Set the chats collection

	fmt.Println("Connected to MongoDB and initialized users collection!")
}

// GetDatabase returns a MongoDB database by name
func GetDatabase(dbName string) *mongo.Database {
	if Client == nil {
		log.Fatal("MongoDB client is not initialized")
	}
	return Client.Database(dbName)
}

func GetUserByIds(userIds []string) ([]*models.UserResponse, error) {
	objectIds, err := convertToObjectIDs(userIds)
	if err != nil {
		return nil, fmt.Errorf("invalid chat ID format: %v", err)
	}
	filter := bson.M{"_id": bson.M{"$in": objectIds}}

	cursor, err := usersCollection.Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var users []*models.UserResponse
	if err := cursor.All(context.Background(), &users); err != nil {
		return nil, err
	}

	if users == nil {
		users = []*models.UserResponse{}
	}

	return users, nil
}

func convertToObjectIDs(stringIds []string) ([]primitive.ObjectID, error) {
	var objectIDs []primitive.ObjectID

	for _, stingId := range stringIds {
		objID, err := primitive.ObjectIDFromHex(stingId)
		if err != nil {
			return nil, fmt.Errorf("invalid chat ID format: %v", err)
		}
		objectIDs = append(objectIDs, objID)
	}

	return objectIDs, nil
}

// CloseMongoDB gracefully closes the MongoDB client
func CloseMongoDB() {
	if Client != nil {
		err := Client.Disconnect(context.Background())
		if err != nil {
			log.Fatal("Failed to disconnect from MongoDB:", err)
		}
		fmt.Println("MongoDB connection closed")
	}
}

func FindUserByUsername(username string) (*models.User, error) {
	var user models.User
	// Use bson.M{} to search for the user by username
	err := usersCollection.FindOne(context.Background(), bson.M{"username": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("error finding user: %v", err)
	}
	return &user, nil
}

// CreateUser inserts a new user into the MongoDB collection
func CreateUser(username, passwordHash string) error {
	_, err := usersCollection.InsertOne(context.Background(), bson.M{
		"username": username,
		"password": passwordHash,
	})
	if err != nil {
		return fmt.Errorf("error inserting user: %v", err)
	}
	return nil
}

func GetUserChats(userID string) ([]*models.Chat, error) {
	var chats []*models.Chat

	// Find documents in the chats collection where "users" contains the userID
	cursor, err := chatsCollection.Find(
		context.Background(),
		bson.M{"users": bson.M{"$in": []string{userID}}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	// Directly decode the entire cursor into the slice
	if err := cursor.All(context.Background(), &chats); err != nil {
		return nil, err
	}

	if chats == nil {
		chats = []*models.Chat{}
	}
	return chats, nil
}

func FindChatByUsers(userIDs []string) (*models.Chat, error) {
	var chat models.Chat
	filter := bson.M{"users": bson.M{"$all": userIDs}}
	err := chatsCollection.FindOne(context.Background(), filter).Decode(&chat)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &chat, err
}

func FindUserChat(chatID string, userID string) (*models.Chat, error) {
	var chat models.Chat
	filter := bson.M{
		"_id":   chatID,
		"users": bson.M{"$in": []string{userID}},
	}
	err := chatsCollection.FindOne(context.Background(), filter).Decode(&chat)
	return &chat, err
}

func CreateChat(chat *models.Chat) error {
	_, err := chatsCollection.InsertOne(context.Background(), chat)
	return err
}

func SaveMessage(message *models.Message) error {
	_, err := messagesCollection.InsertOne(context.Background(), message)
	return err
}

func UpdateChat(chat *models.Chat) error {
	// Convert chat.ID to ObjectId if it's a string
	chatID, err := primitive.ObjectIDFromHex(chat.ID)
	if err != nil {
		return fmt.Errorf("invalid chat ID format: %v", err)
	}

	// Create a filter to find the chat document by _id
	filter := bson.M{"_id": chatID}

	// Create the update operation
	update := bson.M{
		"$set": bson.M{
			"last_message":   chat.LastMessage,   // Update the LastMessage field
			"count_messages": chat.CountMessages, // Update the CreatedAt field (optional, if needed)
		},
	}

	// Perform the update on the document
	_, err = chatsCollection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		log.Printf("Error updating chat: %v", err)
		return err
	}

	return nil
}

func GetChatById(chatID string) (*models.Chat, error) {
	var chat models.Chat

	// Convert the chatID string to an ObjectId
	chatObjectID, err := primitive.ObjectIDFromHex(chatID)
	if err != nil {
		return nil, fmt.Errorf("invalid chat ID format: %v", err)
	}

	// Query the chats collection for the chat document with the provided chatID (as ObjectId)
	filter := bson.M{"_id": chatObjectID}

	// Find the chat by its ID
	err = chatsCollection.FindOne(context.Background(), filter).Decode(&chat)
	if err != nil {
		// If no chat is found or there's an error, return it
		return nil, err
	}

	// Return the list of users in the chat
	return &chat, nil
}

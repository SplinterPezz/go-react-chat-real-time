package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"backend/internal/auth"
	"backend/internal/handlers"
	"backend/internal/messages"
	"backend/mongodb"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func loadEnvFile() {
	// Load environment variables
	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "local"
	}

	var envFile string
	switch appEnv {
	case "prod":
		envFile = ".env.prod"
	case "dev":
		envFile = ".env.dev"
	default:
		envFile = ".env.local"
	}

	err := godotenv.Load(envFile)
	if err != nil {
		log.Fatalf("Error loading .env file for environment %s: %v", appEnv, err)
	}

	fmt.Printf("Loaded environment configuration from %s\n", envFile)
}

func main() {
	// Load environment variables
	loadEnvFile()

	// Initialize MongoDB connection
	mongodb.InitMongoDB()

	// Create a Gin router instance
	r := gin.Default()
	//r.Use(auth.JWTMiddleware) // Apply JWT middleware globally

	// Routes for HTTP-based interactions
	r.GET("/hello", handlers.HelloWorld)

	r.POST("/register", auth.Register)
	r.POST("/login", auth.Login)

	r.GET("/getChats", messages.GetChats)
	r.POST("/createChat", messages.CreateChat)
	// WebSocket route for chat messages
	r.GET("/ws", messages.HandleWebSocket)

	r.GET("/onlineUsers", messages.OnlineUsers)

	// Start HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", os.Getenv("PORT")),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// Start the server in a goroutine
	go func() {
		fmt.Println("Starting server on port", os.Getenv("PORT"))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("ListenAndServe(): ", err)
		}
	}()

	// Graceful shutdown handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	// Graceful shutdown: shut down the server and MongoDB connection
	fmt.Println("Shutting down server...")
	if err := server.Close(); err != nil {
		log.Fatal("Server close:", err)
	}
	mongodb.CloseMongoDB()
}
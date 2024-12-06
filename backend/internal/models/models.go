package models

import "time"

// User represents a basic user model used in both authentication and MongoDB
type User struct {
	ID       string `json:"id" bson:"_id,omitempty"`
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
}

type UserResponse struct {
	ID       string `json:"id" bson:"_id,omitempty"`
	Username string `json:"username"`
}

type Message struct {
	ID      string    `json:"id" bson:"_id,omitempty"`
	ChatID  string    `json:"chat_id" bson:"chat_id"`
	Sender  string    `json:"sender" bson:"sender"`
	Content string    `json:"content" bson:"content"`
	SentAt  time.Time `json:"sent_at" bson:"sent_at"`
}

type Chat struct {
	ID            string    `json:"id" bson:"_id,omitempty"`
	CountMessages int       `json:"count_messages" bson:"count_messages"`
	CreatedBy     string    `json:"created_by" bson:"created_by"`
	Users         []string  `json:"users" bson:"users"`
	LastMessage   string    `json:"last_message" bson:"last_message"`
	CreatedAt     time.Time `json:"created_at" bson:"created_at"`
}

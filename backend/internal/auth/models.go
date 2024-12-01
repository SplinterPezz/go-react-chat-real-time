package auth

import (
	"backend/internal/models"
	"backend/mongodb"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// Register handles user registration by creating a new user
func Register(c *gin.Context) {
	var user models.User
	// Bind JSON request to the user struct
	if err := c.ShouldBindJSON(&user); err != nil {
		// Return a BadRequest if the request body is invalid
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid input"})
		return
	}

	// Check if user already exists
	existingUser, err := mongodb.FindUserByUsername(user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error checking user"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Username already exists"})
		return
	}

	// Hash the password before saving (ensure strong hash)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not hash password"})
		return
	}

	// Create the user in the database
	err = mongodb.CreateUser(user.Username, string(hashedPassword))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not create user"})
		return
	}

	// Generate JWT token for the newly created user
	token, err := GenerateJWT(user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not create token"})
		return
	}

	// Send the token back to the user in the response
	c.JSON(http.StatusOK, gin.H{"token": token})
}

// Login handles user login by verifying credentials and issuing JWT token
func Login(c *gin.Context) {
	var user models.User
	// Bind the incoming JSON request to the user struct
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid input"})
		return
	}

	// Find the user by username in the database
	storedUser, err := mongodb.FindUserByUsername(user.Username)
	if err != nil || storedUser == nil {
		// If user is not found or any DB error occurs, return Unauthorized error
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
		return
	}

	// Compare the stored hashed password with the provided password
	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(user.Password)); err != nil {
		// If password doesn't match, return Unauthorized error
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
		return
	}

	// Generate JWT token for the logged-in user
	token, err := GenerateJWT(user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not create token"})
		return
	}

	// Send the token back to the user in the response
	c.JSON(http.StatusOK, gin.H{"token": token})
}

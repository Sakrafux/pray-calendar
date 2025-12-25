// Provides JWT utility functions for authentication

package security

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var accessSecret = []byte(os.Getenv("ACCESS_SECRET"))
var refreshSecret = []byte(os.Getenv("REFRESH_SECRET"))

// CreateAccessToken creates an access token with very short expiry time (15 min).
// It is supposed to be sent via header during request to authenticate admin permissions.
func CreateAccessToken() (string, error) {
	claims := jwt.MapClaims{
		"exp": time.Now().Add(time.Minute * 15).Unix(),
		"iat": time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(accessSecret)
	return tokenString, err
}

// CreateRefreshToken creates a refresh token with very long expiry time (30 days).
// It is supposed to be sent via httpOnly cookie to facilitate the creation of a new access token without the need to
// manually log in again.
func CreateRefreshToken() (string, error) {
	claims := jwt.MapClaims{
		"exp": time.Now().Add(time.Hour * 24 * 30).Unix(),
		"iat": time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(refreshSecret)
}

// ValidateAccessToken simply validates and extracts the contained information from a provided access token.
func ValidateAccessToken(tokenStr string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return accessSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid access token")
	}

	return token, nil
}

// ValidateRefreshToken simply validates and extracts the contained information from a provided refresh token.
func ValidateRefreshToken(tokenStr string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return refreshSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid refresh token")
	}

	return token, nil
}

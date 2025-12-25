// Defines structs relevant for security purposes

package security

// AdminData encapsulates the name and password for the single admin account.
// Currently, it is not necessary to have proper user management with admin rights.
type AdminData struct {
	Username string
	Password string
}

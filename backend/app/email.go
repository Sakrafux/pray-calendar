package app

import (
	"fmt"
	"os"

	"github.com/resend/resend-go/v2"
)

func sendConfirmationEmail(email, confirmationLink string) error {
	client := resend.NewClient(os.Getenv("RESEND_API_KEY"))

	params := &resend.SendEmailRequest{
		// TODO replace with real domain email
		From: "onboarding@resend.dev",
		// TODO replace with `email`
		To:      []string{"andhell03@gmail.com"},
		Subject: "Bestätigung für Benachrichtigungen - 24/7 Anbetung St. Pölten",
		Html: fmt.Sprintf(`
			<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eeeeee; border-radius: 8px;">
				<h2 style="color: #2c3e50; border-bottom: 2px solid #f1c40f; padding-bottom: 10px;">Bestätigung für Benachrichtigungen</h2>
				<p style="font-weight: bold; color: #2c3e50;">24/7 Anbetung St. Pölten</p>
				
				<p style="text-align: justify;">Sie haben sich angemeldet, um bei kurzfristigen Ausfällen von Timeslots für die Anbetung benachrichtigt zu werden. Wenn dem so ist, bestätigen Sie bitte diese E-Mail über den folgenden Button:</p>
				
				<div style="text-align: center; margin: 30px 0;">
					<a href="%s" style="background-color: #2c3e50; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Bestätigen</a>
				</div>
				
				<p style="text-align: justify;">Sollte man später Benachrichtigungen nicht mehr erhalten wollen, muss man sich per E-Mail bei <a href="mailto:TODO" style="color: #2c3e50; text-decoration: underline;">TODO</a> melden, um ausgetragen zu werden.</p>
				
				<hr style="border: 0; border-top: 1px solid #eeeeee; margin-top: 30px;">
				
				<p style="font-size: 12px; color: #7f8c8d;">Falls das ein Fehler war, ignorieren Sie diese E-Mail einfach.</p>
			</div>
		`, confirmationLink),
	}

	_, err := client.Emails.Send(params)
	return err
}

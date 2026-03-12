// Creates functions for interacting with the resend-SDK to send emails.
// They are separated, because their logic is entirely dependent on the used API or SDK.
// Additionally, a large part is simply defining the required HTML for the email body.

package app

import (
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/resend/resend-go/v2"
)

// sendConfirmationEmail is supposed to be used after a user registers for notifications. As we shouldn't just assume
// that users are truthful in their input, we should confirm that it is actually their email, and they consent to
// the notification emails. It presents the confirmation link for the user to give consent.
func sendConfirmationEmail(email, confirmationLink string) error {
	client := resend.NewClient(os.Getenv("RESEND_API_KEY"))

	params := &resend.SendEmailRequest{
		From:    "24/7 Anbetung St. Pölten <no-reply@send.24-7fastenzeitgebet.com>",
		To:      []string{email},
		Subject: "Bestätigung für Benachrichtigungen - 24/7 Anbetung St. Pölten",
		Html: fmt.Sprintf(`
			<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eeeeee; border-radius: 8px;">
				<h2 style="color: #2c3e50; border-bottom: 2px solid #f1c40f; padding-bottom: 10px;">Bestätigung für Benachrichtigungen</h2>
				<p style="font-weight: bold; color: #2c3e50;">24/7 Anbetung St. Pölten</p>
				
				<p style="text-align: justify;">Du hast dich angemeldet, um per E-Mail Benachrichtigungen über deine Timeslot-Eintragungen zu erhalten. Zusätzlich erklärst du dich einverstanden, über kurzfriste Ausfälle von Timeslots für die Anbetung ebenfalls informiert zu werden.</p>
				
				<p style="text-align: justify;">Wenn du damit einverstanden bist, bestätige bitte diese E-Mail über den folgenden Button:</p>
				
				<div style="text-align: center; margin: 30px 0;">
					<a href="%s" style="background-color: #2c3e50; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Bestätigen</a>
				</div>
				
				<p style="text-align: justify;">Sollte man später Benachrichtigungen nicht mehr erhalten wollen, muss man sich per E-Mail bei <a href="mailto:TODO" style="color: #2c3e50; text-decoration: underline;">TODO</a> melden, um ausgetragen zu werden.</p>
				
				<hr style="border: 0; border-top: 1px solid #eeeeee; margin-top: 30px;">
				
				<p style="font-size: 12px; color: #7f8c8d;">Falls das ein Fehler war, ignoriere diese E-Mail einfach.</p>
			</div>
		`, confirmationLink),
	}

	_, err := client.Emails.Send(params)
	return err
}

// sendNotificationEmail is supposed to be used if a timeslot in the near future is freed up. It informs the volunteer
// of the timeslot that opened up and provides a direct link to the calendar page of the UI for easy access.
func sendNotificationEmail(emails []string, start, end time.Time) error {
	client := resend.NewClient(os.Getenv("RESEND_API_KEY"))

	calendarLink := fmt.Sprintf("%s/calendar", os.Getenv("HOST_FE"))
	dateStr := start.Format("02.01.2006")
	startTimeStr := start.Format("15:04")
	endTimeStr := end.Format("15:04")

	params := &resend.SendEmailRequest{
		From:    "24/7 Anbetung St. Pölten <no-reply@send.24-7fastenzeitgebet.com>",
		To:      []string{"volunteers@24-7fastenzeitgebet.com"},
		Bcc:     emails,
		Subject: fmt.Sprintf("Ausfall am %s um %s-%s - 24/7 Anbetung St. Pölten", dateStr, startTimeStr, endTimeStr),
		Html: fmt.Sprintf(`
			<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eeeeee; border-radius: 8px;">
				<h2 style="color: #c0392b; border-bottom: 2px solid #c0392b; padding-bottom: 10px;">Ausfall am %s um %s-%s</h2>
				<p style="font-weight: bold; color: #2c3e50;">24/7 Anbetung St. Pölten</p>
				
				<p style="text-align: justify;">Jemand hat sich kurzfristig vom Timeslot am %s für <strong>%s bis %s</strong> abgemeldet.</p>
				
				<p style="text-align: justify;">Falls du einspringen kannst, melde dich bitte im Kalender an:</p>
				
				<div style="text-align: center; margin: 30px 0;">
					<a href="%s" style="background-color: #2c3e50; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Zum Kalender</a>
				</div>
				
				<hr style="border: 0; border-top: 1px solid #eeeeee; margin-top: 30px;">
				
				<p style="font-size: 12px; color: #7f8c8d;">Vielen Dank für deinen wertvollen Dienst in der Anbetung!</p>
			</div>
		`, dateStr, startTimeStr, endTimeStr, dateStr, startTimeStr, endTimeStr, calendarLink),
	}

	_, err := client.Emails.Send(params)
	return err
}

// sendEntryConfirmationEmail is supposed to be sent whenever a user registered for notifications is entering an entry.
func sendEntryConfirmationEmail(email string, start, end time.Time) error {
	client := resend.NewClient(os.Getenv("RESEND_API_KEY"))

	dateStr := start.Format("02.01.2006")
	startTimeStr := start.Format("15:04")
	endTimeStr := end.Format("15:04")

	yearS, monthS, dayS := start.Date()
	yearE, monthE, dayE := end.Date()

	// Because I was not careful regarding dates, everything is technically handled as UTC, which is largely no issue,
	// since this project only deals with a single timezone, but it's an issue for the calendar entry to correctly resolve
	loc, _ := time.LoadLocation("Europe/Vienna")
	correctedStartTime := time.Date(yearS, monthS, dayS, start.Hour(), 0, 0, 0, loc)
	correctedEndTime := time.Date(yearE, monthE, dayE, end.Hour(), 0, 0, 0, loc)

	const layout = "20060102T150405Z"
	ics := fmt.Sprintf("BEGIN:VCALENDAR\r\n"+
		"VERSION:2.0\r\n"+
		"PRODID:-//AnbetungStp//DE\r\n"+
		"BEGIN:VEVENT\r\n"+
		"UID:%s@send.24-7fastenzeitgebet.com\r\n"+
		"DTSTAMP:%s\r\n"+
		"DTSTART:%s\r\n"+
		"DTEND:%s\r\n"+
		"SUMMARY:24/7 Anbetung St. Pölten\r\n"+
		"END:VEVENT\r\n"+
		"END:VCALENDAR",
		uuid.New().String(),
		time.Now().UTC().Format(layout),
		correctedStartTime.UTC().Format(layout),
		correctedEndTime.UTC().Format(layout))

	params := &resend.SendEmailRequest{
		From:    "24/7 Anbetung St. Pölten <no-reply@send.24-7fastenzeitgebet.com>",
		To:      []string{"volunteers@24-7fastenzeitgebet.com"},
		Bcc:     []string{email},
		Subject: fmt.Sprintf("Eintrag am %s um %s-%s - 24/7 Anbetung St. Pölten", dateStr, startTimeStr, endTimeStr),
		Html: fmt.Sprintf(`
			<script type="application/ld+json">
            {
				"@context": "http://schema.org",
              	"@type": "Event",
              	"name": "24/7 Anbetung St. Pölten",
              	"startDate": "%s",
				"endDate": "%s"
            }
            </script>
			<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eeeeee; border-radius: 8px;">
				<h2 style="color: #2c3e50; border-bottom: 2px solid #f1c40f; padding-bottom: 10px;">Eintrag am %s um %s-%s</h2>
				<p style="font-weight: bold; color: #2c3e50;">24/7 Anbetung St. Pölten</p>
				
				<p style="text-align: justify;">Du hast dich für den Timeslot am %s für <strong>%s bis %s</strong> angemeldet.</p>
				
				<hr style="border: 0; border-top: 1px solid #eeeeee; margin-top: 30px;">
				
				<p style="font-size: 12px; color: #7f8c8d;">Vielen Dank für deinen wertvollen Dienst in der Anbetung!</p>
			</div>
		`, correctedStartTime.Format(time.RFC3339), correctedEndTime.Format(time.RFC3339), dateStr, startTimeStr, endTimeStr, dateStr, startTimeStr, endTimeStr),
		Attachments: []*resend.Attachment{
			{
				Content:     []byte(ics),
				Filename:    "anbetung.ics",
				ContentType: "text/calendar",
			},
		},
	}

	_, err := client.Emails.Send(params)
	return err
}

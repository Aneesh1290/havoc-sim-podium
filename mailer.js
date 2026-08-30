const nodemailer = require('nodemailer');

// Ensure SMTP_USER and SMTP_PASS are set in your .env or Render Environment Variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendConfirmationEmail = async (booking) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Skipping confirmation email for", booking.order_id);
        return;
    }

    const { order_id, name, email, item_name, price, booking_date, booking_time } = booking;

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111114; color: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #333;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #e5b869; margin-bottom: 5px;">Booking Confirmed!</h1>
            <p style="color: #aaaaaa; margin-top: 0;">Order ID: ${order_id}</p>
        </div>
        
        <div style="background-color: #1a1a1f; padding: 20px; border-radius: 8px;">
            <p style="font-size: 16px; margin-top: 0;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 16px; color: #cccccc;">Your booking at Havoc Sim Podium has been confirmed. Get ready to race!</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Experience</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${item_name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Date</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${booking_date}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Time</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${booking_time}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #888;">Amount Paid</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #e5b869;">₹${price}</td>
                </tr>
            </table>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #666666;">
            <p>Please arrive 10 minutes before your slot.</p>
            <p>Havoc Sim Podium • <a href="https://havocsimpodium.com" style="color: #e5b869;">Visit Website</a></p>
        </div>
    </div>
    `;

    try {
        const textContent = `Booking Confirmed!\nOrder ID: ${order_id}\n\nHi ${name},\nYour booking at Havoc Sim Podium has been confirmed. Get ready to race!\n\nExperience: ${item_name}\nDate: ${booking_date}\nTime: ${booking_time}\nAmount Paid: ₹${price}\n\nPlease arrive 10 minutes before your slot.\nVisit Website: https://havocsimpodium.com`;

        await transporter.sendMail({
            from: `"Havoc Sim Podium" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Booking Confirmed: ${item_name} - ${booking_date}`,
            text: textContent,
            html: htmlContent
        });
        console.log(`[${new Date().toISOString()}] Confirmation email sent to ${email} for order ${order_id}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending email to ${email}:`, error);
    }
};

module.exports = { sendConfirmationEmail };

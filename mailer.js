const nodemailer = require('nodemailer');

// Ensure SMTP_USER and SMTP_PASS are set in your .env or Render Environment Variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendConfirmationEmail = async (bookingOrBookings) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Skipping confirmation email.");
        return;
    }

    const bookings = Array.isArray(bookingOrBookings) ? bookingOrBookings : [bookingOrBookings];
    if (bookings.length === 0) return;

    const primary = bookings[0];
    const customerName = primary.name;
    const customerEmail = primary.email;

    if (!customerEmail) return;

    // Determine base order id (strip _0, _1 if present)
    const baseOrderId = primary.order_id.replace(/_\d+$/, '');
    
    // Check if any booking is Cash/Pay At Desk or Paid
    const isPayAtDesk = bookings.some(b => b.status === 'CASH' || (b.order_id && b.order_id.startsWith('PAYDUE_')));
    const amountLabel = isPayAtDesk ? 'Amount Due (Pay At Desk)' : 'Amount Paid';

    // Calculate totals across all booked items in this order
    const totalAmount = bookings.reduce((sum, b) => sum + (parseFloat(b.price) || 0), 0);
    const subtotal = totalAmount / 1.18;
    const gst = totalAmount - subtotal;

    // Check if any item is 2-player
    const hasTwoPlayer = bookings.some(b => Number(b.players) === 2);

    // Build rows HTML for the experiences table
    const itemsHtml = bookings.map(b => {
        const isDuo = (Number(b.players) === 2);
        return `
        <tr style="border-bottom: 1px solid #2a2a32;">
            <td style="padding: 12px 8px; vertical-align: top;">
                <strong style="color: #ffffff; font-size: 15px;">${b.item_name}</strong>
                <div style="font-size: 12px; color: #888888; margin-top: 4px;">
                    📅 ${b.booking_date} &nbsp;|&nbsp; ⏰ ${b.booking_time}
                </div>
            </td>
            <td style="padding: 12px 8px; text-align: center; vertical-align: top;">
                ${isDuo ? `
                    <span style="display: inline-block; background: rgba(229,184,105,0.15); border: 1px solid rgba(229,184,105,0.4); color: #e5b869; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                        👥 2-Player Duo
                    </span>
                    ${b.player_two_name ? `<div style="font-size: 11px; color: #aaaaaa; margin-top: 3px;">P2: ${b.player_two_name}</div>` : ''}
                ` : `
                    <span style="display: inline-block; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #cccccc; padding: 3px 8px; border-radius: 12px; font-size: 11px;">
                        👤 1-Player
                    </span>
                `}
            </td>
            <td style="padding: 12px 8px; text-align: right; vertical-align: top; font-weight: bold; color: #ffffff;">
                ₹${b.price}
            </td>
        </tr>
        `;
    }).join('');

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111114; color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #333;">
        <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #e5b869; margin-bottom: 6px; font-size: 24px; letter-spacing: 0.5px;">Booking Confirmed!</h1>
            <p style="color: #aaaaaa; margin-top: 0; font-size: 14px;">Order ID: <strong style="color: #ffffff;">#${baseOrderId}</strong></p>
            ${hasTwoPlayer ? `
            <div style="display:inline-block; margin-top: 6px; background: rgba(229,184,105,0.15); border: 1px solid rgba(229,184,105,0.4); padding: 5px 14px; border-radius: 20px;">
                <span style="color: #e5b869; font-weight: bold; font-size: 13px;">👥 Includes 2-Player Duo Pass</span>
            </div>` : `
            <div style="display:inline-block; margin-top: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); padding: 5px 12px; border-radius: 20px;">
                <span style="color: #cccccc; font-size: 13px;">👤 Standard Arena Entry Pass</span>
            </div>`}
        </div>
        
        <div style="background-color: #1a1a1f; padding: 20px; border-radius: 8px; border: 1px solid #282830;">
            <p style="font-size: 16px; margin-top: 0;">Hi <strong>${customerName}</strong>,</p>
            <p style="font-size: 14px; color: #cccccc; line-height: 1.5;">Your booking at Havoc Sim Podium has been confirmed. ${bookings.length > 1 ? `Here are all <strong>${bookings.length} simulator experiences</strong> included in your booking:` : 'Get ready to race!'}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="border-bottom: 2px solid #333; font-size: 12px; color: #888888; text-transform: uppercase;">
                        <th style="padding: 8px 8px; text-align: left;">Experience & Slot</th>
                        <th style="padding: 8px 8px; text-align: center;">Pass Type</th>
                        <th style="padding: 8px 8px; text-align: right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; border-top: 1px solid #333;">
                <tr>
                    <td style="padding: 8px 0; color: #888888; font-size: 13px;">Subtotal (excl. tax)</td>
                    <td style="padding: 8px 0; text-align: right; color: #cccccc; font-size: 13px;">₹${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #888888; font-size: 13px;">GST (18%)</td>
                    <td style="padding: 8px 0; text-align: right; color: #cccccc; font-size: 13px;">₹${gst.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px dashed #444;">
                    <td style="padding: 10px 0; color: #ffffff; font-weight: bold; font-size: 15px;">${amountLabel}</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #e5b869; font-size: 17px;">₹${totalAmount.toFixed(2)}</td>
                </tr>
            </table>

            <div style="margin-top: 20px; padding: 12px; background: rgba(229,184,105,0.08); border: 1px dashed rgba(229,184,105,0.3); border-radius: 6px; font-size: 13px; color: #e5b869; text-align: center;">
                🛡️ <strong>Gate Verification Notice:</strong> Show this single pass email at the arena entrance. Admits all listed players for their reserved time slots.
            </div>
        </div>
        
        <div style="margin-top: 25px; text-align: center; font-size: 12px; color: #666666; line-height: 1.6;">
            <p style="margin: 0;">Please arrive 10 minutes before your slot.</p>
            <p style="margin: 4px 0 0 0;">Havoc Sim Podium • <a href="https://havocsimpodium.com" style="color: #e5b869; text-decoration: none;">Visit Website</a></p>
        </div>
    </div>
    `;

    // Plain text version
    const textItems = bookings.map(b => {
        const isDuo = (Number(b.players) === 2);
        return `- ${b.item_name} | ${b.booking_date} at ${b.booking_time} | ${isDuo ? '2 Players Duo' : '1 Player'}${b.player_two_name ? ` (P2: ${b.player_two_name})` : ''} | ₹${b.price}`;
    }).join('\n');

    const textContent = `Booking Confirmed!\nOrder ID: #${baseOrderId}\n\nHi ${customerName},\nYour booking at Havoc Sim Podium is confirmed!\n\nExperiences Booked (${bookings.length}):\n${textItems}\n\nSubtotal: ₹${subtotal.toFixed(2)}\nGST (18%): ₹${gst.toFixed(2)}\n${amountLabel}: ₹${totalAmount.toFixed(2)}\n\nGate Verification: Show this pass at the arena entrance.\nPlease arrive 10 minutes before your slot.\nWebsite: https://havocsimpodium.com`;

    const adminSubject = `New Booking Alert: #${baseOrderId} - ${customerName} (${bookings.length} item${bookings.length > 1 ? 's' : ''})`;
    const adminText = `A new order has been booked.\n\nOrder ID: #${baseOrderId}\nCustomer Name: ${customerName}\nCustomer Email: ${customerEmail}\nTotal Amount: ₹${totalAmount.toFixed(2)}\n\nExperiences (${bookings.length}):\n${textItems}\n\nPlease check the admin dashboard for details.`;

    const customerSubject = bookings.length === 1
        ? `Booking Confirmed [${bookings[0].players == 2 ? '2-Player Duo Pass' : '1-Player'}]: ${bookings[0].item_name} - ${bookings[0].booking_date}`
        : `Booking Confirmed: Order #${baseOrderId} (${bookings.length} Experiences) - ${primary.booking_date}`;

    try {
        await transporter.sendMail({
            from: `"Havoc Sim Podium" <${process.env.SMTP_USER}>`,
            to: customerEmail,
            subject: customerSubject,
            text: textContent,
            html: htmlContent
        });

        await transporter.sendMail({
            from: `"Havoc System" <${process.env.SMTP_USER}>`,
            to: 'havochobbysim@gmail.com',
            subject: adminSubject,
            text: adminText
        });
        
        console.log(`[${new Date().toISOString()}] Single unified confirmation email sent to ${customerEmail} for order #${baseOrderId} (${bookings.length} items)`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending email to ${customerEmail}:`, error);
    }
};

const sendBulkEmail = async (subject, htmlBody, bccList) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Skipping bulk email.");
        return { success: false, error: "SMTP credentials not configured." };
    }

    try {
        const mailOptions = {
            from: `"Havoc Sim Podium" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Send to self, bcc everyone else
            bcc: bccList,
            subject: subject,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Bulk email sent: ' + info.response);
        return { success: true };
    } catch (error) {
        console.error('Error sending bulk email:', error);
        return { success: false, error: error.message };
    }
};

const sendInstructorEmail = async (instructor, booking) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Skipping instructor email for", booking.order_id);
        return;
    }
    
    if (!instructor.email) return;

    const { name, item_name, booking_date, booking_time } = booking;

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111114; color: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #333;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #e5b869; margin-bottom: 5px;">New Booking Assigned!</h1>
            <p style="color: #aaaaaa; margin-top: 0;">You have a new student.</p>
        </div>
        
        <div style="background-color: #1a1a1f; padding: 20px; border-radius: 8px;">
            <p style="font-size: 16px; margin-top: 0;">Hi <strong>${instructor.name}</strong>,</p>
            <p style="font-size: 16px; color: #cccccc;">A new slot has been booked with you as the instructor.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Student Name</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Simulator</td>
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
            </table>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Havoc Sim Podium • Instructor Notification</p>
        </div>
    </div>
    `;

    const mailOptions = {
        from: '"Havoc Sim Podium" <' + process.env.SMTP_USER + '>',
        to: instructor.email,
        subject: `New Booking: ${booking_date} at ${booking_time}`,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Instructor email sent successfully to", instructor.email);
    } catch (err) {
        console.error("Error sending instructor email:", err);
    }
};

const sendInstructorOtpEmail = async (instructor, otp) => {
    if (!instructor.email) return { success: false, error: "No email address linked to instructor" };

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn(`[DEV OTP] SMTP credentials not set. Password Reset OTP for ${instructor.email} (${instructor.name}): ${otp}`);
        return { success: true, devMode: true };
    }

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #111114; color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid rgba(229,184,105,0.25);">
        <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #e5b869; margin: 0 0 6px 0; font-size: 24px; letter-spacing: 1px;">HAVOC SIM PODIUM</h2>
            <p style="color: #888888; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Instructor Portal Security</p>
        </div>
        
        <div style="background-color: #1a1a1f; padding: 25px; border-radius: 10px; border: 1px solid #2a2a30; text-align: center;">
            <p style="font-size: 15px; margin-top: 0; color: #dddddd; text-align: left;">Hi <strong>${instructor.name || 'Instructor'}</strong>,</p>
            <p style="font-size: 14px; color: #aaaaaa; text-align: left; line-height: 1.5;">We received a request to reset your Instructor Portal password. Use the verification code below to complete the reset:</p>
            
            <div style="margin: 25px auto; padding: 15px 25px; background: #0a0a0c; border: 1px solid #e5b869; border-radius: 8px; display: inline-block;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #e5b869; margin-left: 8px;">${otp}</span>
            </div>
            
            <p style="font-size: 13px; color: #888888; margin: 10px 0 0 0;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
        
        <div style="text-align: center; margin-top: 25px; color: #666666; font-size: 12px; line-height: 1.4;">
            <p style="margin: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
            <p style="margin: 6px 0 0 0;">Havoc Sim Podium • <a href="https://havocsimpodium.com" style="color: #e5b869; text-decoration: none;">havocsimpodium.com</a></p>
        </div>
    </div>
    `;

    const mailOptions = {
        from: `"Havoc Sim Podium Security" <${process.env.SMTP_USER}>`,
        to: instructor.email,
        subject: `Your Password Reset OTP: ${otp}`,
        text: `Hi ${instructor.name || 'Instructor'},\n\nYour OTP to reset your Havoc Sim Podium Instructor Portal password is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Instructor reset OTP email sent successfully to ${instructor.email}`);
        return { success: true };
    } catch (err) {
        console.error("Error sending instructor OTP email:", err);
        return { success: false, error: err.message };
    }
};

module.exports = { sendConfirmationEmail, sendBulkEmail, sendInstructorEmail, sendInstructorOtpEmail };


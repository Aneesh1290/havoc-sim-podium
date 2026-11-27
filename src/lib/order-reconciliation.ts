import { checkIciciPaymentStatus, IciciPaymentStatusResult } from './icici';

export interface OrderConfirmationResult {
    success: boolean;
    alreadyProcessed: boolean;
    orderId: string | null;
    redirectUrl?: string;
    message: string;
    paymentType?: 'ONLINE_HOLD' | 'PAYMENT_LINK' | 'LEGACY_BOOKING' | 'SAFETY_RECOVERY';
    details?: any;
}

export interface ReconcilePendingHoldResult {
    success: boolean;
    isPaid: boolean;
    orderId?: string | null;
    message: string;
    statusResult?: IciciPaymentStatusResult;
}

/**
 * Retrieve hold record from active online_checkout_holds or online_checkout_holds_archive
 */
export function getOnlineCheckoutHold(db: any, txnId: string): Promise<any> {
    return new Promise((resolve) => {
        if (!txnId) return resolve(null);

        // 1. Check active holds first
        db.get('SELECT * FROM online_checkout_holds WHERE txn_id = ?', [txnId], (err: any, activeRow: any) => {
            if (!err && activeRow) {
                return resolve(activeRow);
            }

            // 2. Fall back to archived holds
            db.get('SELECT * FROM online_checkout_holds_archive WHERE txn_id = ?', [txnId], (archErr: any, archRow: any) => {
                if (!archErr && archRow) {
                    console.log(`[Order Reconciliation] Retrieved hold metadata from archive for ${txnId}`);
                    return resolve(archRow);
                }
                return resolve(null);
            });
        });
    });
}

/**
 * Archive a hold record permanently before deletion from active holds
 */
export function archiveCheckoutHold(db: any, txnId: string): Promise<boolean> {
    return new Promise((resolve) => {
        if (!txnId) return resolve(false);

        db.get('SELECT * FROM online_checkout_holds WHERE txn_id = ?', [txnId], (err: any, holdRow: any) => {
            if (err || !holdRow) return resolve(false);

            db.run(
                `INSERT INTO online_checkout_holds_archive 
                    (txn_id, customer_name, customer_email, customer_phone, amount, items_json, whatsapp_consent, applied_coupon, created_at, archived_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT (txn_id) DO UPDATE 
                 SET customer_name = excluded.customer_name,
                     customer_email = excluded.customer_email,
                     customer_phone = excluded.customer_phone,
                     amount = excluded.amount,
                     items_json = excluded.items_json,
                     whatsapp_consent = excluded.whatsapp_consent,
                     applied_coupon = excluded.applied_coupon`,
                [
                    holdRow.txn_id,
                    holdRow.customer_name,
                    holdRow.customer_email,
                    holdRow.customer_phone,
                    holdRow.amount,
                    holdRow.items_json,
                    holdRow.whatsapp_consent,
                    holdRow.applied_coupon,
                    holdRow.created_at || new Date().toISOString()
                ],
                (insErr: any) => {
                    if (insErr) {
                        // SQLite fallback without ON CONFLICT if necessary
                        db.run(
                            `INSERT OR REPLACE INTO online_checkout_holds_archive 
                                (txn_id, customer_name, customer_email, customer_phone, amount, items_json, whatsapp_consent, applied_coupon, created_at, archived_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                            [
                                holdRow.txn_id,
                                holdRow.customer_name,
                                holdRow.customer_email,
                                holdRow.customer_phone,
                                holdRow.amount,
                                holdRow.items_json,
                                holdRow.whatsapp_consent,
                                holdRow.applied_coupon,
                                holdRow.created_at || new Date().toISOString()
                            ],
                            () => resolve(true)
                        );
                    } else {
                        resolve(true);
                    }
                }
            );
        });
    });
}

/**
 * Unified Idempotent Order Confirmation Engine with Zero-Drop Safety Recovery
 */
export async function confirmOrder(
    db: any,
    paymentData: {
        merchantTxnNo: string;
        txnID: string | null;
        amount?: string | number | null;
        paymentMode?: string;
        rawPayload?: any;
    },
    helpers?: {
        getNextOrderNumber?: () => Promise<string>;
        mailer?: any;
        dispatchBookingWhatsAppNotification?: (rows: any[], status: string) => void;
        notifyAssignedInstructors?: (rows: any[]) => void;
    }
): Promise<OrderConfirmationResult> {
    const { merchantTxnNo, txnID, amount, rawPayload } = paymentData;
    const baseOrderId = merchantTxnNo;

    if (!baseOrderId) {
        return {
            success: false,
            alreadyProcessed: false,
            orderId: null,
            message: 'merchantTxnNo is missing'
        };
    }

    return new Promise((resolve) => {
        // 1. Strict Idempotency Check on bookings table
        let checkSql = 'SELECT * FROM bookings WHERE ';
        const checkParams: any[] = [];

        if (txnID) {
            checkSql += '(icici_txn_id = ? OR payment_ref = ? OR icici_merchant_txn = ?)';
            checkParams.push(txnID, txnID, baseOrderId);
        } else {
            checkSql += '(icici_merchant_txn = ? OR order_id LIKE ?)';
            checkParams.push(baseOrderId, `${baseOrderId}%`);
        }

        db.all(checkSql, checkParams, async (checkErr: any, existingBookings: any[]) => {
            if (!checkErr && existingBookings && existingBookings.length > 0) {
                const confirmedOrderId = existingBookings[0].order_id;
                console.log(`[Order Reconciliation] Order already confirmed idempotently: ${confirmedOrderId} (txn: ${txnID})`);

                // Archive and clean up active hold
                if (baseOrderId.startsWith('TXN_SP_')) {
                    await archiveCheckoutHold(db, baseOrderId);
                    db.run('DELETE FROM online_checkout_holds WHERE txn_id = ?', [baseOrderId]);
                }

                return resolve({
                    success: true,
                    alreadyProcessed: true,
                    orderId: confirmedOrderId,
                    redirectUrl: `/success.html?order_id=${confirmedOrderId}`,
                    message: 'Order already confirmed idempotently',
                    paymentType: 'ONLINE_HOLD'
                });
            }

            // 2. Custom Payment Links (Starts with PL_)
            if (baseOrderId.startsWith('PL_')) {
                const parts = baseOrderId.split('_');
                const linkId = parts.length >= 3 ? `${parts[0]}_${parts[1]}` : baseOrderId;

                db.get('SELECT * FROM payment_links WHERE link_id = ?', [linkId], (plErr: any, plRow: any) => {
                    if (plRow && plRow.status === 'PAID') {
                        console.log(`[Order Reconciliation] Payment link ${linkId} was already marked as PAID`);
                        return resolve({
                            success: true,
                            alreadyProcessed: true,
                            orderId: linkId,
                            redirectUrl: `/pay.html?id=${linkId}&status=success`,
                            message: 'Payment link already paid',
                            paymentType: 'PAYMENT_LINK'
                        });
                    }

                    db.run(
                        "UPDATE payment_links SET status = 'PAID', icici_txn_id = ?, icici_merchant_txn = ?, paid_at = CURRENT_TIMESTAMP WHERE link_id = ?",
                        [txnID, baseOrderId, linkId],
                        () => {
                            db.get('SELECT * FROM payment_links WHERE link_id = ?', [linkId], (err: any, updatedPl: any) => {
                                if (!err && updatedPl && updatedPl.order_ids) {
                                    const linkedOrders = updatedPl.order_ids.split(',').map((s: string) => s.trim()).filter(Boolean);
                                    if (linkedOrders.length > 0) {
                                        const placeholders = linkedOrders.map(() => '?').join(',');
                                        db.run(
                                            `UPDATE bookings SET status = 'ATTENDED', payment_ref = ?, icici_txn_id = ?, icici_merchant_txn = ? WHERE order_id IN (${placeholders})`,
                                            [txnID || linkId, txnID, baseOrderId, ...linkedOrders],
                                            () => {
                                                db.run(
                                                    `UPDATE simulator_slot_locks SET status = 'ATTENDED' WHERE source_order_id IN (${placeholders})`,
                                                    linkedOrders
                                                );
                                            }
                                        );
                                    }
                                }

                                return resolve({
                                    success: true,
                                    alreadyProcessed: false,
                                    orderId: linkId,
                                    redirectUrl: `/pay.html?id=${linkId}&status=success`,
                                    message: 'Payment link processed successfully',
                                    paymentType: 'PAYMENT_LINK'
                                });
                            });
                        }
                    );
                });
                return;
            }

            // 3. Slot Booking via Online Checkout Holds (Active or Archived)
            if (baseOrderId.startsWith('TXN_SP_')) {
                getOnlineCheckoutHold(db, baseOrderId).then(async (holdRow) => {
                    if (!holdRow) {
                        // Double check if already booked concurrently by another worker
                        db.all('SELECT * FROM bookings WHERE icici_txn_id = ? OR icici_merchant_txn = ?', [txnID, baseOrderId], async (bErr: any, bRows: any[]) => {
                            if (!bErr && bRows && bRows.length > 0) {
                                const foundOrderId = bRows[0].order_id;
                                return resolve({
                                    success: true,
                                    alreadyProcessed: true,
                                    orderId: foundOrderId,
                                    redirectUrl: `/success.html?order_id=${foundOrderId}`,
                                    message: 'Booking found after hold check',
                                    paymentType: 'ONLINE_HOLD'
                                });
                            }

                            // ----------------------------------------------------
                            // ZERO-DROP SAFETY RECOVERY: Hold metadata missing
                            // ----------------------------------------------------
                            console.warn(`[ZERO-DROP ALERT] Hold metadata missing for paid txn: ${baseOrderId}. Constructing safety booking!`);
                            
                            const payload = rawPayload || {};
                            const respParams = payload.responseParams || {};
                            const recoveredName = payload.customerName || respParams.customerName || payload.addlParam1 || 'Online Guest';
                            const recoveredPhone = payload.customerMobileNo || respParams.customerMobileNo || payload.customerMobile || '';
                            const recoveredEmail = payload.customerEmailID || respParams.customerEmailID || payload.customerEmail || '';
                            const recoveredAmount = parseFloat(amount || payload.amount || respParams.amount || 0).toFixed(2);

                            let orderNo = '01';
                            if (helpers?.getNextOrderNumber) {
                                orderNo = await helpers.getNextOrderNumber();
                            } else {
                                orderNo = String(Date.now()).slice(-4);
                            }
                            const safetyOrderId = `PAID_SP_${orderNo}`;
                            const today = new Date();
                            const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                            const todayStr = `${monthNames[today.getMonth()]} ${today.getDate()} (${dayNames[today.getDay()]})`;

                            db.run(
                                `INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status, whatsapp_consent, icici_txn_id, icici_merchant_txn, applied_coupon)
                                 VALUES (?, ?, ?, ?, 'Race Sim Session (Recovered)', ?, 'Immediate / Pending Desk Assignment', 'PAID', 1, ?, ?, NULL)`,
                                [
                                    safetyOrderId,
                                    recoveredName,
                                    recoveredEmail,
                                    recoveredPhone,
                                    recoveredAmount,
                                    todayStr,
                                    txnID,
                                    baseOrderId
                                ],
                                function (sErr: any) {
                                    if (sErr) console.error('[ZERO-DROP] Error inserting safety booking:', sErr);

                                    // Log critical alert in audit table
                                    db.run(
                                        `INSERT INTO payment_gateway_logs 
                                            (gateway, merchant_txn_no, gateway_txn_id, amount, status, response_code, raw_payload, source)
                                         VALUES ('ICICI', ?, ?, ?, 'SAFETY_RECOVERED_PAID', 'ZERO_DROP', ?, 'SYSTEM_RECOVERY')`,
                                        [baseOrderId, txnID, parseFloat(recoveredAmount), JSON.stringify({ note: 'Hold missing - recovered payment into order', payload })]
                                    );

                                    db.all('SELECT * FROM bookings WHERE order_id = ?', [safetyOrderId], (err: any, rows: any[]) => {
                                        if (!err && rows && rows.length > 0) {
                                            try {
                                                if (helpers?.mailer?.sendConfirmationEmail) helpers.mailer.sendConfirmationEmail(rows);
                                                if (helpers?.dispatchBookingWhatsAppNotification) helpers.dispatchBookingWhatsAppNotification(rows, 'Paid Online');
                                            } catch (e) {
                                                console.error('[ZERO-DROP] Notification error:', e);
                                            }
                                        }
                                    });

                                    return resolve({
                                        success: true,
                                        alreadyProcessed: false,
                                        orderId: safetyOrderId,
                                        redirectUrl: `/success.html?order_id=${safetyOrderId}`,
                                        message: 'Payment recovered safely and booking registered',
                                        paymentType: 'SAFETY_RECOVERY'
                                    });
                                }
                            );
                        });
                        return;
                    }

                    // Standard hold confirmation using retrieved (active or archived) hold metadata
                    try {
                        const items = JSON.parse(holdRow.items_json || '[]');
                        const totalBaseCost = items.reduce((sum: number, i: any) => sum + (Number(i.base_price) || 0) + (Number(i.instructor_fee) || 0), 0);

                        let orderNo = '01';
                        if (helpers?.getNextOrderNumber) {
                            orderNo = await helpers.getNextOrderNumber();
                        } else {
                            orderNo = String(Date.now()).slice(-4);
                        }

                        const finalOrderId = `PAID_SP_${orderNo}`;
                        let insertedCount = 0;

                        items.forEach((item: any, index: number) => {
                            const rowOrderId = items.length > 1 ? `${finalOrderId}_${index}` : finalOrderId;
                            let itemPrice = (parseFloat(holdRow.amount) / items.length).toFixed(2);
                            if (totalBaseCost > 0) {
                                const itemRatio = ((Number(item.base_price) || 0) + (Number(item.instructor_fee) || 0)) / totalBaseCost;
                                itemPrice = (parseFloat(holdRow.amount) * itemRatio).toFixed(2);
                            }

                            db.run(
                                `INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status, instructor_id, players, player_two_name, whatsapp_consent, icici_txn_id, icici_merchant_txn, applied_coupon)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    rowOrderId,
                                    holdRow.customer_name,
                                    holdRow.customer_email,
                                    holdRow.customer_phone,
                                    item.item_name,
                                    itemPrice,
                                    item.date,
                                    item.time,
                                    item.instructor_id || null,
                                    item.players || 1,
                                    item.player_two_name || null,
                                    holdRow.whatsapp_consent,
                                    txnID,
                                    baseOrderId,
                                    holdRow.applied_coupon || null
                                ],
                                async function (insErr: any) {
                                    if (insErr) {
                                        console.error('[Order Reconciliation] Insert confirmed booking error:', insErr);
                                    }
                                    insertedCount++;

                                    if (insertedCount === items.length) {
                                        // Archive hold permanently before deletion
                                        await archiveCheckoutHold(db, baseOrderId);
                                        db.run('DELETE FROM online_checkout_holds WHERE txn_id = ?', [baseOrderId]);

                                        // Ensure simulator_slot_locks status is marked PAID
                                        db.run(
                                            `UPDATE simulator_slot_locks SET status = 'PAID' WHERE source_order_id = ? OR source_order_id LIKE ?`,
                                            [finalOrderId, `${finalOrderId}%`]
                                        );

                                        // Fetch confirmed rows and dispatch communications
                                        db.all('SELECT * FROM bookings WHERE order_id LIKE ?', [`${finalOrderId}%`], (err: any, rows: any[]) => {
                                            if (!err && rows && rows.length > 0) {
                                                try {
                                                    if (helpers?.mailer?.sendConfirmationEmail) {
                                                        helpers.mailer.sendConfirmationEmail(rows);
                                                    }
                                                    if (helpers?.dispatchBookingWhatsAppNotification) {
                                                        helpers.dispatchBookingWhatsAppNotification(rows, 'Paid Online');
                                                    }
                                                    if (helpers?.notifyAssignedInstructors) {
                                                        helpers.notifyAssignedInstructors(rows);
                                                    }
                                                } catch (commErr) {
                                                    console.error('[Order Reconciliation] Communications dispatch error:', commErr);
                                                }
                                            }
                                        });

                                        return resolve({
                                            success: true,
                                            alreadyProcessed: false,
                                            orderId: finalOrderId,
                                            redirectUrl: `/success.html?order_id=${finalOrderId}`,
                                            message: 'Booking confirmed and slot locked successfully',
                                            paymentType: 'ONLINE_HOLD'
                                        });
                                    }
                                }
                            );
                        });
                    } catch (parseErr: any) {
                        console.error('[Order Reconciliation] Parse hold items_json error:', parseErr);
                        return resolve({
                            success: false,
                            alreadyProcessed: false,
                            orderId: null,
                            redirectUrl: '/checkout.html?error=Error confirming booking',
                            message: 'Error parsing hold items'
                        });
                    }
                });
                return;
            }

            // 4. Fallback for legacy or direct baseOrderId
            db.run("UPDATE bookings SET status = 'PAID', icici_txn_id = ? WHERE order_id LIKE ?", [txnID, `${baseOrderId}%`], () => {
                db.all('SELECT * FROM bookings WHERE order_id LIKE ?', [`${baseOrderId}%`], (err: any, rows: any[]) => {
                    if (!err && rows && rows.length > 0) {
                        try {
                            if (helpers?.mailer?.sendConfirmationEmail) {
                                helpers.mailer.sendConfirmationEmail(rows);
                            }
                            if (helpers?.dispatchBookingWhatsAppNotification) {
                                helpers.dispatchBookingWhatsAppNotification(rows, 'Paid Online');
                            }
                            if (helpers?.notifyAssignedInstructors) {
                                helpers.notifyAssignedInstructors(rows);
                            }
                        } catch (commErr) {
                            console.error('[Order Reconciliation] Legacy communications error:', commErr);
                        }
                    }
                });

                return resolve({
                    success: true,
                    alreadyProcessed: false,
                    orderId: baseOrderId,
                    redirectUrl: `/success.html?order_id=${baseOrderId}`,
                    message: 'Legacy order status updated to PAID',
                    paymentType: 'LEGACY_BOOKING'
                });
            });
        });
    });
}

/**
 * Reconcile a specific pending hold by polling ICICI status API
 */
export async function reconcilePendingHold(
    db: any,
    txnId: string,
    helpers?: {
        getNextOrderNumber?: () => Promise<string>;
        mailer?: any;
        dispatchBookingWhatsAppNotification?: (rows: any[], status: string) => void;
        notifyAssignedInstructors?: (rows: any[]) => void;
    }
): Promise<ReconcilePendingHoldResult> {
    const statusResult = await checkIciciPaymentStatus(txnId);

    if (statusResult.isPaid) {
        const confirmResult = await confirmOrder(
            db,
            {
                merchantTxnNo: txnId,
                txnID: statusResult.txnID || null,
                amount: statusResult.amount,
                rawPayload: statusResult.rawResponse
            },
            helpers
        );

        return {
            success: confirmResult.success,
            isPaid: true,
            orderId: confirmResult.orderId,
            message: confirmResult.message,
            statusResult
        };
    }

    return {
        success: true,
        isPaid: false,
        orderId: null,
        message: statusResult.description || 'Transaction is not in paid status',
        statusResult
    };
}

module.exports = {
    getOnlineCheckoutHold,
    archiveCheckoutHold,
    confirmOrder,
    reconcilePendingHold
};

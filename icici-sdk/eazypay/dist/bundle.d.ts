declare class BaseDTO {
    merchantId: string;
    subMerchantId: string;
    terminalId: string;
    merchantTranId: string;
}

declare class CallbackStatus1RequestDTO extends BaseDTO {
    BankRRN: string;
    refId: string;
    TransactionDate: string;
    transactionType: string;
}

declare class CallbackStatus2RequestDTO extends BaseDTO {
    BankRRN: string;
    refId: string;
    TransactionDate: string;
    transactionType: string;
}

declare class CollectPay1RequestDTO extends BaseDTO {
    note: string;
    amount: string;
    collectByDate: string;
    payerVa: string;
    billNumber: string;
    subMerchantName: string;
    merchantName: string;
    validatePayerAccFlag: string;
    payerAccount: string;
    payerIFSC: string;
}

declare class CollectPay2RequestDTO extends CollectPay1RequestDTO {
}

declare class CollectPay3RequestDTO extends CollectPay1RequestDTO {
}

declare class merchantIdDTO extends BaseDTO {
    payerVa: string;
    amount: string;
    note: string;
    collectByDate: string;
    merchantName: string;
    subMerchantName: string;
    billNumber: string;
    validatePayerAccFlag: string;
    payerAccount: string;
    payerIFSC: string;
}

declare class CollectPayRequestDTO {
    amount: string;
    merchantId: merchantIdDTO;
}

declare class CreateMandateRequestDTO extends CollectPay1RequestDTO {
    validityStartDate: string;
    validityEndDate: string;
    amountLimit: string;
    remark: string;
    requestType: string;
    frequency: string;
    autoExecute: string;
    debitDay: string;
    debitRule: string;
    revokable: string;
    blockfund: string;
    purpose: string;
    ValidatePayerAccFlag: string;
    UMN: string;
}

declare class CreateVouchersRequestDTO {
    beneficiaryID: string;
    mobileNumber: string;
    beneficiaryName: string;
    amount: string;
    expiry: string;
    purposeCode: string;
    mcc: string;
    VoucherRedemptionType: string;
    PayerVA: string;
    type: string;
    merchantId: string;
    subMerchantId: string;
    merchantTranId: string;
}

declare class DelayedSettlementsRequestDTO {
    UUID: string;
    UMN: string;
    releaseMoneyTo: string;
    amount: string;
    beneficiaryIdentifier: string;
    merchantId: string;
    merchantTranId: string;
}

declare class ExecuteMandateRequestDTO extends BaseDTO {
    merchantName: string;
    subMerchantName: string;
    amount: string;
    billNumber: string;
    remark: string;
    retryCount: number;
    mandateSeqNo: string;
    UMN: string;
    purpose: string;
}

declare class MandateNotificationRequestDTO extends BaseDTO {
    payerVa: string;
    amount: string;
    note: string;
    executionDate: string;
    mandateSeqNo: string;
    key: string;
    value: string;
    merchantName: string;
    subMerchantName: string;
}

declare class QR1RequestDTO {
    amount: string;
    billNumber: string;
    billNumber2: string;
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
}

declare class QR2RequestDTO {
    amount: string;
    billNumber: string;
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
}

declare class QR3RequestDTO {
    amount: string;
    billNumber: string;
    validatePayerAccFlag: string;
    payerAccount: string;
    payerIFSC: string;
    signedIntentFlag: string;
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    validityStartDateTime: string;
    validityEndDateTime: string;
    update: string;
    refId: string;
    signIntentFlag: string;
}

declare class QRRequestDTO {
    amount: string;
    billNumber: string;
    update: string;
    validityStartDateTime: string;
    signedIntentFlag: string;
    payerAccount: string;
    validityEndDateTime: string;
    payerIFSC: string;
    ValidatePayerAccFlag: string;
    refId: string;
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
}

declare class RedeemVoucherRequestDTO extends BaseDTO {
    merchantName: string;
    subMerchantName: string;
    MCC: string;
    amount: string;
    txnNote: string;
    UUID: string;
    UMN: string;
    OTP: string;
    note: string;
}

declare class Refund1RequestDTO extends BaseDTO {
    originalBankRRN: string;
    originalmerchantTranId: string;
    payeeVA: string;
    refundAmount: string;
    note: string;
    onlineRefund: string;
}

declare class Refund2RequestDTO extends Refund1RequestDTO {
}

declare class RefundRequestDTO extends Refund1RequestDTO {
}

declare class TransactionStatus1RequestDTO extends BaseDTO {
}

declare class TransactionStatus2RequestDTO extends BaseDTO {
}

declare class TransactionStatus3RequestDTO extends BaseDTO {
}

declare class TransactionstatusbycriteriaRequestDTO extends BaseDTO {
    transactionType: string;
    UMN: string;
}

declare class TransactionStatusRequestDTO extends BaseDTO {
}

declare class ValidateVoucherRequestDTO extends BaseDTO {
    merchantName: string;
    subMerchantName: string;
    MCC: string;
    amount: string;
    txnNote: string;
    validityStartDate: string;
    validityEndDate: string;
    UMN: string;
    amRule: string;
    pa: string;
    sign: string;
    orgId: string;
    purpose: string;
    mode: string;
}

declare class RevokeMandateRequestDTO {
    merchantId: string;
    subMerchantId: string;
    terminalId: string;
    merchantName: string;
    subMerchantName: string;
    payerVa: string;
    amount: string;
    note: string;
    collectByDate: string;
    merchantTranId: string;
    billNumber: string;
    requestType: string;
    validityStartDate: string;
    validityEndDate: string;
    amountLimit: string;
    remark: string;
    frequency: string;
    autoExecute: string;
    debitDay: string;
    debitRule: string;
    revokable: string;
    blockfund: string;
    purpose: string;
    UMN: string;
}

declare class UpdateMandateRequestDTO {
    merchantId: string;
    subMerchantId: string;
    terminalId: string;
    merchantName: string;
    subMerchantName: string;
    payerVa: string;
    amount: string;
    note: string;
    collectByDate: string;
    merchantTranId: string;
    billNumber: string;
    validityStartDate: string;
    validityEndDate: string;
    amountLimit: string;
    remark: string;
    requestType: string;
    frequency: string;
    autoExecute: string;
    debitDay: string;
    debitRule: string;
    revokable: string;
    blockfund: string;
    purpose: string;
    UMN: string;
}

declare class CallbackStatus1ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    originalBankRRN: string;
    response: string;
    amount: string;
    success: string;
    message: string;
    status: string;
    payerVA: string;
    txnInitDate: string;
    txnCompletionDate: string;
    refundRRN: string;
    errormessage: string;
}

declare class CallbackStatus2ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    response: string;
    originalBankRRN: string;
    amount: string;
    success: string;
    message: string;
    status: string;
    payerVA: string;
    txnInitDate: string;
    txnCompletionDate: string;
    refundRRN: string;
    payerAccountType: string;
    sequenceNum: string;
    errormessage: string;
}

declare class CollectPay1ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    response: string;
    success: string;
    message: string;
    bankRRN: string;
    amount: string;
    errormessage: string;
}

declare class CollectPay2ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    response: string;
    success: string;
    message: string;
    bankRRN: string;
    amount: string;
    errormessage: string;
}

declare class CollectPay123ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    response: string;
    success: string;
    message: string;
    bankRRN: string;
    amount: string;
    errormessage: string;
}

declare class CollectPayResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    success: string;
    response: string;
    status: string;
    message: string;
    originalBankRRN: string;
    bankRRN: string;
    errormessage: string;
}

declare class CreateMandateResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    amount: string;
    response: string;
    success: string;
    message: string;
    bankRRN: string;
    errormessage: string;
}

declare class CreateVoucherResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    response: string;
    success: string;
    message: string;
    amount: string;
    expiryDate: string;
    UMN: string;
    UUID: string;
    status: string;
    errormessage: string;
}

declare class DelayedSettlementResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    response: string;
    message: string;
    amount: string;
    errormessage: string;
}

declare class ExecuteMandateResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    amount: string;
    response: string;
    success: string;
    message: string;
    bankRRN: string;
    errormessage: string;
}

declare class MandateNotificationResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    amount: string;
    response: string;
    success: string;
    message: string;
    bankRRN: string;
    errormessage: string;
}

declare class QR1ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    response: string;
    success: string;
    message: string;
    refId: string;
    errormessage: string;
}

declare class QR2ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    response: string;
    success: string;
    message: string;
    refId: string;
    errormessage: string;
}

declare class QR123ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    response: string;
    success: string;
    message: string;
    refId: string;
    errormessage: string;
}

declare class QRResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    success: string;
    response: string;
    status: string;
    message: string;
    originalBankRRN: string;
    refId: string;
    errormessage: string;
}

declare class RedeemVoucherResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    success: string;
    response: string;
    message: string;
    bankRRN: string;
    amount: string;
    UUID: string;
    UMN: string;
    errormessage: string;
}

declare class TransactionStatus1ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    originalBankRRN: string;
    response: string;
    amount: string;
    success: string;
    message: string;
    status: string;
    errormessage: string;
}

declare class TransactionStatus12ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    originalBankRRN: string;
    response: string;
    amount: string;
    success: string;
    message: string;
    status: string;
    errormessage: string;
}

declare class TransactionStatus3ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    originalBankRRN: string;
    response: string;
    amount: string;
    success: string;
    message: string;
    status: string;
    payerAccountType: string;
    sequenceNum: string;
    errormessage: string;
}

declare class TransactionStatusbyCriteriaResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    originalBankRRN: string;
    amount: string;
    payerVA: string;
    response: string;
    success: string;
    message: string;
    status: string;
    txnInitDate: string;
    txnCompletionDate: string;
    UMN: string;
    errormessage: string;
}

declare class TransactionStatusResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    originalBankRRN: string;
    amount: string;
    response: string;
    success: string;
    message: string;
    status: string;
    UMN: string;
    sequenceNum: string;
    payerAccountType: string;
    errormessage: string;
}

declare class ValidateVoucherResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    success: string;
    response: string;
    message: string;
    bankRRN: string;
}

declare class RefundStatusResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    subMerchantId: string;
    success: string;
    response: string;
    status: string;
    message: string;
    originalBankRRN: string;
    errormessage: string;
}

declare class RefundAPI12ResponseDTO {
    merchantId: string;
    terminalId: string;
    merchantTranId: string;
    success: string;
    response: string;
    message: string;
    refId: string;
}

declare const DTOs: {
    readonly CallbackStatus1RequestDTO: typeof CallbackStatus1RequestDTO;
    readonly CallbackStatus2RequestDTO: typeof CallbackStatus2RequestDTO;
    readonly CollectPay1RequestDTO: typeof CollectPay1RequestDTO;
    readonly CollectPay2RequestDTO: typeof CollectPay2RequestDTO;
    readonly CollectPay3RequestDTO: typeof CollectPay3RequestDTO;
    readonly CollectPayRequestDTO: typeof CollectPayRequestDTO;
    readonly CreateMandateRequestDTO: typeof CreateMandateRequestDTO;
    readonly CreateVouchersRequestDTO: typeof CreateVouchersRequestDTO;
    readonly DelayedSettlementsRequestDTO: typeof DelayedSettlementsRequestDTO;
    readonly ExecuteMandateRequestDTO: typeof ExecuteMandateRequestDTO;
    readonly MandateNotificationRequestDTO: typeof MandateNotificationRequestDTO;
    readonly QR1RequestDTO: typeof QR1RequestDTO;
    readonly QR2RequestDTO: typeof QR2RequestDTO;
    readonly QR3RequestDTO: typeof QR3RequestDTO;
    readonly QRRequestDTO: typeof QRRequestDTO;
    readonly RedeemVoucherRequestDTO: typeof RedeemVoucherRequestDTO;
    readonly Refund1RequestDTO: typeof Refund1RequestDTO;
    readonly Refund2RequestDTO: typeof Refund2RequestDTO;
    readonly RefundRequestDTO: typeof RefundRequestDTO;
    readonly TransactionStatus1RequestDTO: typeof TransactionStatus1RequestDTO;
    readonly TransactionStatus2RequestDTO: typeof TransactionStatus2RequestDTO;
    readonly TransactionStatus3RequestDTO: typeof TransactionStatus3RequestDTO;
    readonly TransactionstatusbycriteriaRequestDTO: typeof TransactionstatusbycriteriaRequestDTO;
    readonly TransactionStatusRequestDTO: typeof TransactionStatusRequestDTO;
    readonly ValidateVoucherRequestDTO: typeof ValidateVoucherRequestDTO;
    readonly RevokeMandateRequestDTO: typeof RevokeMandateRequestDTO;
    readonly UpdateMandateRequestDTO: typeof UpdateMandateRequestDTO;
};

export { CallbackStatus1RequestDTO, CallbackStatus1ResponseDTO, CallbackStatus2RequestDTO, CallbackStatus2ResponseDTO, CollectPay123ResponseDTO, CollectPay1RequestDTO, CollectPay1ResponseDTO, CollectPay2RequestDTO, CollectPay2ResponseDTO, CollectPay3RequestDTO, CollectPayRequestDTO, CollectPayResponseDTO, CreateMandateRequestDTO, CreateMandateResponseDTO, CreateVoucherResponseDTO, CreateVouchersRequestDTO, DTOs, DelayedSettlementResponseDTO, DelayedSettlementsRequestDTO, ExecuteMandateRequestDTO, ExecuteMandateResponseDTO, MandateNotificationRequestDTO, MandateNotificationResponseDTO, QR123ResponseDTO, QR1RequestDTO, QR1ResponseDTO, QR2RequestDTO, QR2ResponseDTO, QR3RequestDTO, QRRequestDTO, QRResponseDTO, RedeemVoucherRequestDTO, RedeemVoucherResponseDTO, Refund1RequestDTO, Refund2RequestDTO, RefundAPI12ResponseDTO, RefundRequestDTO, RefundStatusResponseDTO, RevokeMandateRequestDTO, TransactionStatus12ResponseDTO, TransactionStatus1RequestDTO, TransactionStatus1ResponseDTO, TransactionStatus2RequestDTO, TransactionStatus3RequestDTO, TransactionStatus3ResponseDTO, TransactionStatusRequestDTO, TransactionStatusResponseDTO, TransactionStatusbyCriteriaResponseDTO, TransactionstatusbycriteriaRequestDTO, UpdateMandateRequestDTO, ValidateVoucherRequestDTO, ValidateVoucherResponseDTO };

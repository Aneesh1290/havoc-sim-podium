import { __decorate, __metadata } from 'tslib';
import { IsNotEmpty, IsString, IsOptional, ValidateIf, IsObject } from 'class-validator';

class BaseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO.prototype, "subMerchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO.prototype, "merchantTranId", void 0);

class CallbackStatus1RequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "BankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TransactionDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "transactionType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus1RequestDTO.prototype, "BankRRN", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus1RequestDTO.prototype, "refId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus1RequestDTO.prototype, "TransactionDate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus1RequestDTO.prototype, "transactionType", void 0);

class CallbackStatus2RequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "BankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TransactionDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "transactionType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus2RequestDTO.prototype, "BankRRN", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus2RequestDTO.prototype, "refId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus2RequestDTO.prototype, "TransactionDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus2RequestDTO.prototype, "transactionType", void 0);

class CollectPay1RequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectByDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerVa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validatePayerAccFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "collectByDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "payerVa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "validatePayerAccFlag", void 0);
__decorate([
    ValidateIf((c) => c.validatePayerAccFlag === "Y"),
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "payerAccount", void 0);
__decorate([
    ValidateIf((c) => c.validatePayerAccFlag === "Y"),
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "payerIFSC", void 0);

class CollectPay2RequestDTO extends CollectPay1RequestDTO {
}

class CollectPay3RequestDTO extends CollectPay1RequestDTO {
}

class merchantIdDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "payerVa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectByDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validatePayerAccFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "payerVa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "collectByDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "validatePayerAccFlag", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "payerAccount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "payerIFSC", void 0);

class CollectPayRequestDTO {
    constructor() {
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPayRequestDTO.prototype, "amount", void 0);
__decorate([
    IsObject(),
    IsNotEmpty(),
    __metadata("design:type", merchantIdDTO)
], CollectPayRequestDTO.prototype, "merchantId", void 0);

class CreateMandateRequestDTO extends CollectPay1RequestDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "validityStartDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amountLimit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remark", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "requestType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "frequency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoExecute", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "debitDay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "debitRule", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "revokable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "blockfund", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ValidatePayerAccFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "validityStartDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "validityEndDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "amountLimit", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "remark", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "requestType", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "frequency", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "autoExecute", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "debitDay", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "debitRule", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "revokable", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "blockfund", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "purpose", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "ValidatePayerAccFlag", void 0);
__decorate([
    ValidateIf((c) => c.requestType === "R" || c.requestType === "U"),
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "UMN", void 0);

class CreateVouchersRequestDTO {
    constructor() {
        Object.defineProperty(this, "beneficiaryID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mobileNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneficiaryName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "expiry", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purposeCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mcc", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "VoucherRedemptionType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PayerVA", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "type", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "beneficiaryID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "mobileNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "beneficiaryName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "expiry", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "purposeCode", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "mcc", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "VoucherRedemptionType", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "PayerVA", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "type", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "subMerchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "merchantTranId", void 0);

class DelayedSettlementsRequestDTO {
    constructor() {
        Object.defineProperty(this, "UUID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "releaseMoneyTo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneficiaryIdentifier", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "UUID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "UMN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "releaseMoneyTo", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "beneficiaryIdentifier", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "merchantTranId", void 0);

class ExecuteMandateRequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remark", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "retryCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mandateSeqNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "remark", void 0);
__decorate([
    ValidateIf((c) => c.purpose === "RECURRING"),
    IsNotEmpty(),
    __metadata("design:type", Number)
], ExecuteMandateRequestDTO.prototype, "retryCount", void 0);
__decorate([
    ValidateIf((c) => c.purpose === "RECURRING"),
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "mandateSeqNo", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "UMN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "purpose", void 0);

class MandateNotificationRequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "payerVa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "executionDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mandateSeqNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "key", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "value", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "payerVa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "executionDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "mandateSeqNo", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "key", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "value", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "subMerchantName", void 0);

class QR1RequestDTO {
    constructor() {
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber2", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "billNumber2", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "merchantTranId", void 0);

class QR2RequestDTO {
    constructor() {
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR2RequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR2RequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR2RequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR2RequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR2RequestDTO.prototype, "merchantTranId", void 0);

class QR3RequestDTO {
    constructor() {
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validatePayerAccFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "signedIntentFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityStartDateTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDateTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "update", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "signIntentFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "validatePayerAccFlag", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "payerAccount", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "payerIFSC", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "signedIntentFlag", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "merchantTranId", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "validityStartDateTime", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "validityEndDateTime", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "update", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "refId", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "signIntentFlag", void 0);

class QRRequestDTO {
    constructor() {
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "update", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityStartDateTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "signedIntentFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDateTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ValidatePayerAccFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "update", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "validityStartDateTime", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "signedIntentFlag", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "payerAccount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "validityEndDateTime", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "payerIFSC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "ValidatePayerAccFlag", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "refId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "merchantTranId", void 0);

class RedeemVoucherRequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "MCC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnNote", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UUID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "OTP", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "MCC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "txnNote", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "UUID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "UMN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "OTP", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "note", void 0);

class Refund1RequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalmerchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payeeVA", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refundAmount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onlineRefund", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "originalBankRRN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "originalmerchantTranId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "payeeVA", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "refundAmount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "onlineRefund", void 0);

class Refund2RequestDTO extends Refund1RequestDTO {
}

class RefundRequestDTO extends Refund1RequestDTO {
}

class TransactionStatus1RequestDTO extends BaseDTO {
}

class TransactionStatus2RequestDTO extends BaseDTO {
}

class TransactionStatus3RequestDTO extends BaseDTO {
}

class TransactionstatusbycriteriaRequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "transactionType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionstatusbycriteriaRequestDTO.prototype, "transactionType", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], TransactionstatusbycriteriaRequestDTO.prototype, "UMN", void 0);

class TransactionStatusRequestDTO extends BaseDTO {
}

class ValidateVoucherRequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "MCC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnNote", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityStartDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amRule", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "pa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "sign", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "orgId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "MCC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "txnNote", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "validityStartDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "validityEndDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "UMN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "amRule", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "pa", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "sign", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "orgId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "purpose", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "mode", void 0);

class RevokeMandateRequestDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerVa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectByDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "requestType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "R"
        });
        Object.defineProperty(this, "validityStartDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amountLimit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remark", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "frequency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoExecute", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "N"
        });
        Object.defineProperty(this, "debitDay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "debitRule", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "revokable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "Y"
        });
        Object.defineProperty(this, "blockfund", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "subMerchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "payerVa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "collectByDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "merchantTranId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "requestType", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "validityStartDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "validityEndDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "amountLimit", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "remark", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "frequency", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "autoExecute", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "debitDay", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "debitRule", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "revokable", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "blockfund", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "purpose", void 0);
__decorate([
    ValidateIf((c) => c.requestType === "R" || c.requestType === "U"),
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "UMN", void 0);

class UpdateMandateRequestDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerVa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectByDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityStartDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amountLimit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remark", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "requestType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "U"
        });
        Object.defineProperty(this, "frequency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoExecute", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "N"
        });
        Object.defineProperty(this, "debitDay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "debitRule", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "revokable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "blockfund", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "subMerchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "payerVa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "collectByDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "merchantTranId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "validityStartDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "validityEndDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "amountLimit", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "remark", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "requestType", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "frequency", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "autoExecute", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "debitDay", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "debitRule", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "revokable", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "blockfund", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "purpose", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "UMN", void 0);

class CallbackStatus1ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerVA", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnInitDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnCompletionDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refundRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class CallbackStatus2ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerVA", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnInitDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnCompletionDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refundRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccountType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "sequenceNum", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class CollectPay1ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class CollectPay2ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class CollectPay123ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class CollectPayResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class CreateMandateResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class CreateVoucherResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "expiryDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UUID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class DelayedSettlementResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class ExecuteMandateResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class MandateNotificationResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class QR1ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class QR2ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class QR123ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class QRResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class RedeemVoucherResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UUID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class TransactionStatus1ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class TransactionStatus12ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class TransactionStatus3ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccountType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "sequenceNum", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class TransactionStatusbyCriteriaResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerVA", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnInitDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnCompletionDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class TransactionStatusResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "sequenceNum", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccountType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class ValidateVoucherResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class RefundStatusResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errormessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

class RefundAPI12ResponseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "success", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}

const DTOs = {
    CallbackStatus1RequestDTO,
    CallbackStatus2RequestDTO,
    CollectPay1RequestDTO,
    CollectPay2RequestDTO,
    CollectPay3RequestDTO,
    CollectPayRequestDTO,
    CreateMandateRequestDTO,
    CreateVouchersRequestDTO,
    DelayedSettlementsRequestDTO,
    ExecuteMandateRequestDTO,
    MandateNotificationRequestDTO,
    QR1RequestDTO,
    QR2RequestDTO,
    QR3RequestDTO,
    QRRequestDTO,
    RedeemVoucherRequestDTO,
    Refund1RequestDTO,
    Refund2RequestDTO,
    RefundRequestDTO,
    TransactionStatus1RequestDTO,
    TransactionStatus2RequestDTO,
    TransactionStatus3RequestDTO,
    TransactionstatusbycriteriaRequestDTO,
    TransactionStatusRequestDTO,
    ValidateVoucherRequestDTO,
    RevokeMandateRequestDTO,
    UpdateMandateRequestDTO,
};

export { CallbackStatus1RequestDTO, CallbackStatus1ResponseDTO, CallbackStatus2RequestDTO, CallbackStatus2ResponseDTO, CollectPay123ResponseDTO, CollectPay1RequestDTO, CollectPay1ResponseDTO, CollectPay2RequestDTO, CollectPay2ResponseDTO, CollectPay3RequestDTO, CollectPayRequestDTO, CollectPayResponseDTO, CreateMandateRequestDTO, CreateMandateResponseDTO, CreateVoucherResponseDTO, CreateVouchersRequestDTO, DTOs, DelayedSettlementResponseDTO, DelayedSettlementsRequestDTO, ExecuteMandateRequestDTO, ExecuteMandateResponseDTO, MandateNotificationRequestDTO, MandateNotificationResponseDTO, QR123ResponseDTO, QR1RequestDTO, QR1ResponseDTO, QR2RequestDTO, QR2ResponseDTO, QR3RequestDTO, QRRequestDTO, QRResponseDTO, RedeemVoucherRequestDTO, RedeemVoucherResponseDTO, Refund1RequestDTO, Refund2RequestDTO, RefundAPI12ResponseDTO, RefundRequestDTO, RefundStatusResponseDTO, RevokeMandateRequestDTO, TransactionStatus12ResponseDTO, TransactionStatus1RequestDTO, TransactionStatus1ResponseDTO, TransactionStatus2RequestDTO, TransactionStatus3RequestDTO, TransactionStatus3ResponseDTO, TransactionStatusRequestDTO, TransactionStatusResponseDTO, TransactionStatusbyCriteriaResponseDTO, TransactionstatusbycriteriaRequestDTO, UpdateMandateRequestDTO, ValidateVoucherRequestDTO, ValidateVoucherResponseDTO };

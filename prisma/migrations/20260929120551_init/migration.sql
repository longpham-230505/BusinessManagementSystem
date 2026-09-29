-- CreateEnum
CREATE TYPE "CameraInstanceStatus" AS ENUM ('IN_SERVICE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('RENTAL', 'FILM_SALE', 'PHOTO_PRINT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_BOOKING_DEPOSIT', 'BOOKED', 'RENTING', 'RETURNED', 'PENDING', 'PAID', 'DELIVERING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DepositKind" AS ENUM ('BOOKING', 'SECURITY_CASH', 'SECURITY_ITEM', 'SECURITY_NONE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('BOOKING_DEPOSIT_RECEIVED', 'BOOKING_DEPOSIT_REFUNDED', 'SECURITY_DEPOSIT_RECEIVED', 'SECURITY_DEPOSIT_REFUNDED', 'ORDER_PAYMENT', 'ORDER_REFUND', 'SHIPPING_FEE_RECEIVED', 'SHIPPING_FEE_PAID');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'STATUS_CHANGE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camera_models" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "default_booking_deposit" DECIMAL(14,0) NOT NULL DEFAULT 40000,
    "default_price_1day" DECIMAL(14,0),
    "default_price_combo3" DECIMAL(14,0),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "camera_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camera_instances" (
    "id" UUID NOT NULL,
    "camera_model_id" UUID NOT NULL,
    "asset_code" VARCHAR(50) NOT NULL,
    "branch_id" UUID NOT NULL,
    "price_1day" DECIMAL(14,0) NOT NULL,
    "price_combo3" DECIMAL(14,0) NOT NULL,
    "film_remaining" INTEGER NOT NULL DEFAULT 0,
    "status" "CameraInstanceStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "purchase_cost" DECIMAL(14,0),
    "purchase_date" DATE,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "camera_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camera_movements" (
    "id" UUID NOT NULL,
    "camera_instance_id" UUID NOT NULL,
    "from_branch_id" UUID NOT NULL,
    "to_branch_id" UUID NOT NULL,
    "order_id" UUID,
    "moved_at" TIMESTAMPTZ NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camera_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "film_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "default_sale_price" DECIMAL(14,0) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "film_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "film_batches" (
    "id" UUID NOT NULL,
    "film_type_id" UUID NOT NULL,
    "quantity_original" INTEGER NOT NULL,
    "quantity_remaining" INTEGER NOT NULL,
    "unit_cost" DECIMAL(14,0) NOT NULL,
    "received_date" DATE NOT NULL,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "film_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "film_stock_adjustments" (
    "id" UUID NOT NULL,
    "film_batch_id" UUID NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "adjusted_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "film_stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_services" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit_price" DECIMAL(14,0) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "print_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "contact_channel" VARCHAR(50),
    "contact_handle" VARCHAR(255),
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_code" VARCHAR(30) NOT NULL,
    "order_type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "customer_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "order_date" TIMESTAMPTZ NOT NULL,
    "shipping_fee" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "surcharge_amount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "surcharge_note" TEXT,
    "notes" TEXT,
    "completed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_details" (
    "order_id" UUID NOT NULL,
    "pickup_at" TIMESTAMPTZ NOT NULL,
    "return_due_at" TIMESTAMPTZ NOT NULL,
    "returned_at" TIMESTAMPTZ,
    "rental_days" INTEGER NOT NULL,
    "return_branch_id" UUID,
    "id_card_received_at" TIMESTAMPTZ,
    "id_card_returned_at" TIMESTAMPTZ,

    CONSTRAINT "rental_details_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "rental_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "camera_instance_id" UUID NOT NULL,
    "unit_price_1day" DECIMAL(14,0) NOT NULL,
    "unit_price_combo3" DECIMAL(14,0) NOT NULL,
    "combo3_count" INTEGER NOT NULL,
    "single_day_count" INTEGER NOT NULL,
    "rental_fee" DECIMAL(14,0) NOT NULL,
    "other_cost" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "other_cost_note" TEXT,
    "is_blocking" BOOLEAN NOT NULL DEFAULT true,
    "booked_period" tstzrange,

    CONSTRAINT "rental_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "film_sale_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "film_type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sale_price" DECIMAL(14,0) NOT NULL,

    CONSTRAINT "film_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "film_batch_consumptions" (
    "id" UUID NOT NULL,
    "film_sale_item_id" UUID,
    "photo_print_item_id" UUID,
    "film_batch_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(14,0) NOT NULL,

    CONSTRAINT "film_batch_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_print_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "print_service_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(14,0) NOT NULL,
    "film_type_id" UUID,
    "film_quantity" INTEGER,

    CONSTRAINT "photo_print_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "kind" "DepositKind" NOT NULL,
    "amount_received" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "amount_refunded" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "amount_forfeited" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "item_description" TEXT,
    "item_returned_at" TIMESTAMPTZ,
    "received_at" TIMESTAMPTZ NOT NULL,
    "resolved_at" TIMESTAMPTZ,
    "resolution_note" TEXT,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "deposit_id" UUID,
    "payment_type" "PaymentType" NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payment_date" TIMESTAMPTZ NOT NULL,
    "notes" TEXT,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_transactions" (
    "id" UUID NOT NULL,
    "branch_id" UUID,
    "order_id" UUID,
    "category_id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "description" TEXT,
    "transaction_date" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "other_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "camera_instances_branch_id_idx" ON "camera_instances"("branch_id");

-- CreateIndex
CREATE INDEX "camera_instances_camera_model_id_idx" ON "camera_instances"("camera_model_id");

-- CreateIndex
CREATE INDEX "camera_movements_camera_instance_id_idx" ON "camera_movements"("camera_instance_id");

-- CreateIndex
CREATE INDEX "camera_movements_order_id_idx" ON "camera_movements"("order_id");

-- CreateIndex
CREATE INDEX "film_batches_film_type_id_received_date_id_idx" ON "film_batches"("film_type_id", "received_date", "id");

-- CreateIndex
CREATE INDEX "film_stock_adjustments_film_batch_id_idx" ON "film_stock_adjustments"("film_batch_id");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "orders_order_type_status_idx" ON "orders"("order_type", "status");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_branch_id_idx" ON "orders"("branch_id");

-- CreateIndex
CREATE INDEX "orders_order_date_idx" ON "orders"("order_date");

-- CreateIndex
CREATE INDEX "rental_items_order_id_idx" ON "rental_items"("order_id");

-- CreateIndex
CREATE INDEX "rental_items_camera_instance_id_idx" ON "rental_items"("camera_instance_id");

-- CreateIndex
CREATE INDEX "film_sale_items_order_id_idx" ON "film_sale_items"("order_id");

-- CreateIndex
CREATE INDEX "film_batch_consumptions_film_sale_item_id_idx" ON "film_batch_consumptions"("film_sale_item_id");

-- CreateIndex
CREATE INDEX "film_batch_consumptions_photo_print_item_id_idx" ON "film_batch_consumptions"("photo_print_item_id");

-- CreateIndex
CREATE INDEX "film_batch_consumptions_film_batch_id_idx" ON "film_batch_consumptions"("film_batch_id");

-- CreateIndex
CREATE INDEX "photo_print_items_order_id_idx" ON "photo_print_items"("order_id");

-- CreateIndex
CREATE INDEX "deposits_order_id_idx" ON "deposits"("order_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_deposit_id_idx" ON "payments"("deposit_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "other_transactions_branch_id_idx" ON "other_transactions"("branch_id");

-- CreateIndex
CREATE INDEX "other_transactions_order_id_idx" ON "other_transactions"("order_id");

-- CreateIndex
CREATE INDEX "other_transactions_transaction_date_idx" ON "other_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "camera_instances" ADD CONSTRAINT "camera_instances_camera_model_id_fkey" FOREIGN KEY ("camera_model_id") REFERENCES "camera_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_instances" ADD CONSTRAINT "camera_instances_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_movements" ADD CONSTRAINT "camera_movements_camera_instance_id_fkey" FOREIGN KEY ("camera_instance_id") REFERENCES "camera_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_movements" ADD CONSTRAINT "camera_movements_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_movements" ADD CONSTRAINT "camera_movements_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_movements" ADD CONSTRAINT "camera_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_batches" ADD CONSTRAINT "film_batches_film_type_id_fkey" FOREIGN KEY ("film_type_id") REFERENCES "film_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_stock_adjustments" ADD CONSTRAINT "film_stock_adjustments_film_batch_id_fkey" FOREIGN KEY ("film_batch_id") REFERENCES "film_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_details" ADD CONSTRAINT "rental_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_details" ADD CONSTRAINT "rental_details_return_branch_id_fkey" FOREIGN KEY ("return_branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_items" ADD CONSTRAINT "rental_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_items" ADD CONSTRAINT "rental_items_camera_instance_id_fkey" FOREIGN KEY ("camera_instance_id") REFERENCES "camera_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_sale_items" ADD CONSTRAINT "film_sale_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_sale_items" ADD CONSTRAINT "film_sale_items_film_type_id_fkey" FOREIGN KEY ("film_type_id") REFERENCES "film_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_batch_consumptions" ADD CONSTRAINT "film_batch_consumptions_film_sale_item_id_fkey" FOREIGN KEY ("film_sale_item_id") REFERENCES "film_sale_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_batch_consumptions" ADD CONSTRAINT "film_batch_consumptions_photo_print_item_id_fkey" FOREIGN KEY ("photo_print_item_id") REFERENCES "photo_print_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_batch_consumptions" ADD CONSTRAINT "film_batch_consumptions_film_batch_id_fkey" FOREIGN KEY ("film_batch_id") REFERENCES "film_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_print_items" ADD CONSTRAINT "photo_print_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_print_items" ADD CONSTRAINT "photo_print_items_print_service_id_fkey" FOREIGN KEY ("print_service_id") REFERENCES "print_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_print_items" ADD CONSTRAINT "photo_print_items_film_type_id_fkey" FOREIGN KEY ("film_type_id") REFERENCES "film_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_transactions" ADD CONSTRAINT "other_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_transactions" ADD CONSTRAINT "other_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_transactions" ADD CONSTRAINT "other_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "transaction_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

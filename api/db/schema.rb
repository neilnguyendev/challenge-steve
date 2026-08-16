# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2026_08_16_000003) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "admin_users", force: :cascade do |t|
    t.string "email", null: false
    t.string "password_digest", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_admin_users_on_email", unique: true
  end

  create_table "trading_days", force: :cascade do |t|
    t.bigint "venue_id", null: false
    t.date "date", null: false
    t.integer "pos_revenue", default: 0, null: false
    t.integer "eatclub_revenue", default: 0, null: false
    t.integer "labour_cost", default: 0, null: false
    t.integer "covers", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["venue_id", "date"], name: "index_trading_days_on_venue_id_and_date", unique: true
    t.index ["venue_id"], name: "index_trading_days_on_venue_id"
  end

  create_table "venues", force: :cascade do |t|
    t.string "name", null: false
    t.string "timezone", default: "Australia/Melbourne", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "trading_days", "venues"
end

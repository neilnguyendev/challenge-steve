# One row = one venue's day of trading.
#
# Money is stored as whole AUD, not cents: the business records takings to the
# dollar and every figure on the dashboard is rendered without decimals. If
# sub-dollar precision is ever needed, this is the migration to revisit.
#
# total_revenue is deliberately absent — it is always pos_revenue +
# eatclub_revenue, and storing a derived column invites the two to disagree.
class CreateTradingDays < ActiveRecord::Migration[7.1]
  def change
    create_table :trading_days do |t|
      t.references :venue, null: false, foreign_key: true
      t.date :date, null: false

      t.integer :pos_revenue, null: false, default: 0
      t.integer :eatclub_revenue, null: false, default: 0
      t.integer :labour_cost, null: false, default: 0
      t.integer :covers, null: false, default: 0

      t.timestamps
    end

    add_index :trading_days, %i[venue_id date], unique: true
  end
end

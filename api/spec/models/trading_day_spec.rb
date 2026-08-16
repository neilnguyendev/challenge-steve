require "rails_helper"

RSpec.describe TradingDay do
  describe "#total_revenue" do
    it "is the sum of the two revenue streams" do
      day = build(:trading_day, pos_revenue: 1_750, eatclub_revenue: 320)

      expect(day.total_revenue).to eq(2_070)
    end
  end

  describe "validations" do
    it "rejects a second row for the same venue and date" do
      first = create(:trading_day)
      duplicate = build(:trading_day, venue: first.venue, date: first.date)

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:date]).to be_present
    end

    it "rejects negative money" do
      expect(build(:trading_day, pos_revenue: -1)).not_to be_valid
    end
  end
end

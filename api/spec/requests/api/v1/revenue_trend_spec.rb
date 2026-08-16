require "rails_helper"

# Acceptance criteria from docs/tasks/BE-05-revenue-trend-endpoint.md
RSpec.describe "GET /api/v1/revenue_trend" do
  # 2026-08-10 is a Monday; 08-03 is the Monday before it.
  let(:week)          { Date.new(2026, 8, 10) }
  let(:previous_week) { Date.new(2026, 8, 3) }
  let(:venue)         { create(:venue) }

  # Values chosen so every total in the assertions is checkable by hand.
  def record_week(monday, pos:, eatclub:, labour: 500, covers: 100)
    (0..6).map do |offset|
      create(:trading_day,
             venue: venue,
             date: monday + offset,
             pos_revenue: pos,
             eatclub_revenue: eatclub,
             labour_cost: labour,
             covers: covers)
    end
  end

  def body = response.parsed_body

  describe "BE05-AS-1: request without comparison" do
    it "returns seven days and no previous period" do
      record_week(week, pos: 1_000, eatclub: 200)

      get "/api/v1/revenue_trend", params: { venue_id: venue.id, week_start: week.to_s }

      expect(response).to have_http_status(:ok)
      expect(body["series"].length).to eq(7)
      expect(body["previous_period"]).to be_nil
      expect(body["series"].map { |d| d["previous"] }).to all(be_nil)
      expect(body["summary"]["total_revenue"]["delta_pct"]).to be_nil
    end
  end

  describe "BE05-AS-2: comparison against the previous week" do
    it "reports both periods and the change between them" do
      record_week(week, pos: 1_000, eatclub: 200)          # 7 * 1200 = 8400
      record_week(previous_week, pos: 900, eatclub: 100)   # 7 * 1000 = 7000

      get "/api/v1/revenue_trend",
          params: { venue_id: venue.id, week_start: week.to_s, compare: true }

      expect(body["previous_period"]).to eq(
        "start" => "2026-08-03", "end" => "2026-08-09"
      )
      expect(body["summary"]["total_revenue"]["current"]).to eq(8_400)
      expect(body["summary"]["total_revenue"]["previous"]).to eq(7_000)
      expect(body["summary"]["total_revenue"]["delta_pct"]).to eq(20.0)
    end

    it "uses the same field names for both periods" do
      record_week(week, pos: 1_000, eatclub: 200)
      record_week(previous_week, pos: 900, eatclub: 100)

      get "/api/v1/revenue_trend",
          params: { venue_id: venue.id, week_start: week.to_s, compare: true }

      monday = body["series"].first
      expect(monday["previous"].keys).to match_array(monday["current"].keys)
      expect(monday["previous"]).to include(
        "pos_revenue" => 900, "eatclub_revenue" => 100
      )
    end
  end

  describe "BE05-AS-3: previous period has no trading" do
    it "reports zero rather than dividing by it" do
      record_week(week, pos: 1_000, eatclub: 200)

      expect {
        get "/api/v1/revenue_trend",
            params: { venue_id: venue.id, week_start: week.to_s, compare: true }
      }.not_to raise_error

      expect(body["summary"]["total_revenue"]["previous"]).to eq(0)
      expect(body["summary"]["total_revenue"]["delta_pct"]).to be_nil
      expect(body["summary"]["average_per_day"]["delta_pct"]).to be_nil
      expect(body["summary"]["total_covers"]["delta_pct"]).to be_nil
    end
  end

  describe "BE05-AS-4: a day with no trading" do
    it "still appears, zero-filled" do
      create(:trading_day, venue: venue, date: week, pos_revenue: 1_000)

      get "/api/v1/revenue_trend", params: { venue_id: venue.id, week_start: week.to_s }

      wednesday = body["series"].find { |d| d["date"] == "2026-08-12" }
      expect(wednesday["weekday"]).to eq("Wed")
      expect(wednesday["current"].values).to all(eq(0))
    end
  end

  describe "BE05-AS-5: week_start must be a Monday" do
    it "refuses a Tuesday and says why" do
      get "/api/v1/revenue_trend",
          params: { venue_id: venue.id, week_start: "2026-08-11" }

      expect(response).to have_http_status(:unprocessable_content)
      expect(body["error"]).to eq("week_start must be a Monday")
    end

    it "refuses a date it cannot read" do
      get "/api/v1/revenue_trend",
          params: { venue_id: venue.id, week_start: "not-a-date" }

      expect(response).to have_http_status(:unprocessable_content)
      expect(body["error"]).to match(/YYYY-MM-DD/)
    end
  end

  describe "BE05-AS-6: average per day divides by seven" do
    it "ignores how many days actually traded" do
      # Three days totalling 7000, four days with nothing.
      [0, 1, 2].each do |offset|
        create(:trading_day, venue: venue, date: week + offset,
                             pos_revenue: 2_000, eatclub_revenue: 333, labour_cost: 0, covers: 0)
      end
      create(:trading_day, venue: venue, date: week + 3,
                           pos_revenue: 1, eatclub_revenue: 0, labour_cost: 0, covers: 0)

      get "/api/v1/revenue_trend", params: { venue_id: venue.id, week_start: week.to_s }

      expect(body["summary"]["total_revenue"]["current"]).to eq(7_000)
      expect(body["summary"]["average_per_day"]["current"]).to eq(1_000)
    end
  end

  describe "BE05-AS-7: reflects an admin change immediately" do
    it "serves the new figure on the next read" do
      wednesday = create(:trading_day, venue: venue, date: Date.new(2026, 8, 12),
                                       pos_revenue: 1_830, eatclub_revenue: 0)

      get "/api/v1/revenue_trend", params: { venue_id: venue.id, week_start: week.to_s }
      before_total = body["summary"]["total_revenue"]["current"]

      wednesday.update!(pos_revenue: 2_000)

      get "/api/v1/revenue_trend", params: { venue_id: venue.id, week_start: week.to_s }
      updated = body["series"].find { |d| d["date"] == "2026-08-12" }

      expect(updated["current"]["pos_revenue"]).to eq(2_000)
      expect(body["summary"]["total_revenue"]["current"]).to eq(before_total + 170)
    end
  end

  describe "BE05-AS-8: available_range spans all recorded trading" do
    it "reports the earliest and latest recorded dates, not the requested week" do
      create(:trading_day, venue: venue, date: previous_week)
      create(:trading_day, venue: venue, date: week + 6)

      get "/api/v1/revenue_trend", params: { venue_id: venue.id, week_start: week.to_s }
      expect(body["available_range"]).to eq(
        "earliest" => "2026-08-03", "latest" => "2026-08-16"
      )

      get "/api/v1/revenue_trend",
          params: { venue_id: venue.id, week_start: previous_week.to_s }
      expect(body["available_range"]).to eq(
        "earliest" => "2026-08-03", "latest" => "2026-08-16"
      )
    end
  end

  describe "BE05-AS-9: nothing recorded at all" do
    it "reports an empty range but still seven days" do
      venue

      get "/api/v1/revenue_trend", params: { venue_id: venue.id, week_start: week.to_s }

      expect(body["available_range"]).to eq("earliest" => nil, "latest" => nil)
      expect(body["series"].length).to eq(7)
    end
  end

  describe "BE05-R1: the payload shape" do
    it "does not carry a per-day total alongside its components" do
      record_week(week, pos: 1_000, eatclub: 200)

      get "/api/v1/revenue_trend", params: { venue_id: venue.id, week_start: week.to_s }

      expect(body["series"].first["current"]).not_to have_key("total_revenue")
    end
  end

  describe "venue resolution" do
    it "falls back to the only venue when none is named" do
      record_week(week, pos: 1_000, eatclub: 200)

      get "/api/v1/revenue_trend", params: { week_start: week.to_s }

      expect(response).to have_http_status(:ok)
      expect(body["summary"]["total_revenue"]["current"]).to eq(8_400)
    end

    it "refuses a venue that does not exist" do
      get "/api/v1/revenue_trend", params: { venue_id: 999_999, week_start: week.to_s }

      expect(response).to have_http_status(:not_found)
      expect(body["error"]).to eq("Venue not found")
    end
  end
end

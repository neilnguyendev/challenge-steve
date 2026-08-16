require "rails_helper"

RSpec.describe "/api/v1/admin/trading_days" do
  let(:admin) { create(:admin_user) }
  let(:venue) { create(:venue) }
  let(:week)  { Date.new(2026, 8, 10) } # a Monday

  def body = response.parsed_body
  def auth(token = AdminToken.issue(admin)) = { "Authorization" => "Bearer #{token}" }

  def week_payload(overrides = {})
    days = (0..6).map do |offset|
      {
        date: (week + offset).to_s,
        pos_revenue: 1_000,
        eatclub_revenue: 200,
        labour_cost: 300,
        covers: 50
      }
    end
    overrides.each { |offset, patch| days[offset].merge!(patch) }
    { venue_id: venue.id, week_start: week.to_s, days: days }
  end

  # ---------------------------------------------------------------- S-003 ----

  describe "AS-012: a privileged call with no token" do
    it "is refused and returns no data" do
      create(:trading_day, venue: venue, date: week)

      get "/api/v1/admin/trading_days",
          params: { venue_id: venue.id, week_start: week.to_s }

      expect(response).to have_http_status(:unauthorized)
      expect(body).not_to have_key("days")
    end
  end

  describe "AS-013: a token this system did not issue" do
    it "is refused and returns no data" do
      foreign = JWT.encode({ sub: admin.id, exp: 1.hour.from_now.to_i },
                           "a-different-secret", "HS256")

      get "/api/v1/admin/trading_days",
          params: { venue_id: venue.id, week_start: week.to_s },
          headers: auth(foreign)

      expect(response).to have_http_status(:unauthorized)
      expect(body).not_to have_key("days")
    end

    it "refuses a token that is not a token at all" do
      get "/api/v1/admin/trading_days",
          params: { venue_id: venue.id, week_start: week.to_s },
          headers: auth("garbage")

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "AS-026: a session older than a day" do
    it "is refused exactly as an absent token is" do
      expired = travel_to(25.hours.ago) { AdminToken.issue(admin) }

      get "/api/v1/admin/trading_days",
          params: { venue_id: venue.id, week_start: week.to_s },
          headers: auth(expired)

      expect(response).to have_http_status(:unauthorized)
      expect(body["error"]).to eq("Unauthorized")
    end

    it "still accepts a session issued 23 hours ago" do
      fresh = travel_to(23.hours.ago) { AdminToken.issue(admin) }

      get "/api/v1/admin/trading_days",
          params: { venue_id: venue.id, week_start: week.to_s },
          headers: auth(fresh)

      expect(response).to have_http_status(:ok)
    end
  end

  # ---------------------------------------------------------------- S-004 ----

  describe "AS-014: listing a week" do
    it "returns seven days in order, untraded ones zero" do
      create(:trading_day, venue: venue, date: week,
                           pos_revenue: 1_750, eatclub_revenue: 300, labour_cost: 590, covers: 105)
      create(:trading_day, venue: venue, date: week + 1, pos_revenue: 1_800)

      get "/api/v1/admin/trading_days",
          params: { venue_id: venue.id, week_start: week.to_s }, headers: auth

      expect(response).to have_http_status(:ok)
      expect(body["days"].length).to eq(7)
      expect(body["days"].map { |d| d["date"] }).to eq((0..6).map { (week + _1).to_s })

      expect(body["days"][0]).to include(
        "pos_revenue" => 1_750, "eatclub_revenue" => 300, "labour_cost" => 590, "covers" => 105
      )
      expect(body["days"][2].values_at("pos_revenue", "eatclub_revenue", "labour_cost", "covers"))
        .to all(eq(0))
    end
  end

  describe "AS-015: saving a week replaces days that already had figures" do
    it "overwrites in place rather than adding a second row" do
      create(:trading_day, venue: venue, date: week + 2, pos_revenue: 1_830)

      put "/api/v1/admin/trading_days",
          params: week_payload(2 => { pos_revenue: 2_000 }), headers: auth, as: :json

      expect(response).to have_http_status(:ok)
      expect(venue.trading_days.where(date: week + 2).count).to eq(1)
      expect(venue.trading_days.find_by(date: week + 2).pos_revenue).to eq(2_000)
    end
  end

  describe "AS-016: the same save records days that had none" do
    it "creates the missing rows" do
      create(:trading_day, venue: venue, date: week)
      expect(venue.trading_days.count).to eq(1)

      put "/api/v1/admin/trading_days",
          params: week_payload(3 => { pos_revenue: 1_780, eatclub_revenue: 310,
                                      labour_cost: 600, covers: 108 }),
          headers: auth, as: :json

      expect(venue.trading_days.count).to eq(7)
      thursday = venue.trading_days.find_by(date: week + 3)
      expect(thursday).to have_attributes(
        pos_revenue: 1_780, eatclub_revenue: 310, labour_cost: 600, covers: 108
      )
    end
  end

  describe "AS-017: one bad figure abandons the entire save" do
    it "names the offending day and leaves every other day untouched" do
      create(:trading_day, venue: venue, date: week + 2, pos_revenue: 1_830)

      put "/api/v1/admin/trading_days",
          params: week_payload(2 => { pos_revenue: 2_000 },
                               4 => { labour_cost: -1 }),
          headers: auth, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(body["error"]).to include("2026-08-14")
      expect(body["error"].downcase).to include("labour")

      # The valid change in the same request must not have landed.
      expect(venue.trading_days.find_by(date: week + 2).pos_revenue).to eq(1_830)
      expect(venue.trading_days.count).to eq(1)
    end
  end

  describe "AS-027: an unauthenticated save" do
    it "is refused and changes nothing" do
      create(:trading_day, venue: venue, date: week + 2, pos_revenue: 1_830)

      put "/api/v1/admin/trading_days", params: week_payload(2 => { pos_revenue: 2_000 }), as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(venue.trading_days.find_by(date: week + 2).pos_revenue).to eq(1_830)
      expect(venue.trading_days.count).to eq(1)
    end
  end

  describe "week_start validation" do
    it "refuses a week that does not start on a Monday" do
      get "/api/v1/admin/trading_days",
          params: { venue_id: venue.id, week_start: "2026-08-11" }, headers: auth

      expect(response).to have_http_status(:unprocessable_content)
      expect(body["error"]).to eq("week_start must be a Monday")
    end

    it "refuses a save whose days fall outside the named week" do
      payload = week_payload
      payload[:days][0][:date] = "2026-09-01"

      put "/api/v1/admin/trading_days", params: payload, headers: auth, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(body["error"]).to match(/outside/i)
      expect(venue.trading_days.count).to eq(0)
    end
  end
end

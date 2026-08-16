require "rails_helper"

# AS-021 — the seam the whole brief turns on: what an admin saves is exactly
# what the dashboard shows.
#
# Deliberately NOT mocked at either end. It signs in for a real token, PUTs
# through the real admin endpoint, and reads back through the real public one,
# against the real database. A mocked version of this test would pass while the
# two halves disagreed about which surface carries a field or when — which is
# the only failure it exists to catch.
RSpec.describe "Seam: admin save -> dashboard read" do
  let(:week) { Date.new(2026, 8, 10) } # Monday
  let!(:venue) { create(:venue) }
  let!(:admin) { create(:admin_user, email: "admin@example.com", password: "password123") }

  def body = response.parsed_body

  def sign_in
    post "/api/v1/admin/login",
         params: { email: "admin@example.com", password: "password123" }
    { "Authorization" => "Bearer #{body['token']}" }
  end

  def dashboard_wednesday
    get "/api/v1/revenue_trend", params: { venue_id: venue.id, week_start: week.to_s }
    body["series"].find { |day| day["weekday"] == "Wed" }
  end

  def week_total
    get "/api/v1/revenue_trend", params: { venue_id: venue.id, week_start: week.to_s }
    body["summary"]["total_revenue"]["current"]
  end

  before do
    (0..6).each do |offset|
      create(:trading_day, venue: venue, date: week + offset,
                           pos_revenue: 1_830, eatclub_revenue: 0,
                           labour_cost: 0, covers: 10)
    end
  end

  it "AS-021: a saved figure moves both the day's bar and the week's total" do
    headers = sign_in
    expect(dashboard_wednesday["current"]["pos_revenue"]).to eq(1_830)
    total_before = week_total

    days = (0..6).map do |offset|
      {
        date: (week + offset).to_s,
        pos_revenue: offset == 2 ? 2_000 : 1_830,
        eatclub_revenue: 0,
        labour_cost: 0,
        covers: 10
      }
    end

    put "/api/v1/admin/trading_days",
        params: { venue_id: venue.id, week_start: week.to_s, days: days },
        headers: headers, as: :json

    expect(response).to have_http_status(:ok)

    # The chart column and the summary card read the same response, so both
    # must move by the same 170.
    expect(dashboard_wednesday["current"]["pos_revenue"]).to eq(2_000)
    expect(week_total).to eq(total_before + 170)
  end

  it "AS-021: a refused save leaves the dashboard exactly as it was" do
    headers = sign_in
    total_before = week_total

    days = (0..6).map do |offset|
      {
        date: (week + offset).to_s,
        pos_revenue: offset == 2 ? 2_500 : 1_830,
        eatclub_revenue: 0,
        labour_cost: offset == 4 ? -1 : 0,
        covers: 10
      }
    end

    put "/api/v1/admin/trading_days",
        params: { venue_id: venue.id, week_start: week.to_s, days: days },
        headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(dashboard_wednesday["current"]["pos_revenue"]).to eq(1_830)
    expect(week_total).to eq(total_before)
  end

  it "AS-021 / C-003: no caching sits between the write and the read" do
    headers = sign_in

    # Two saves in a row: the second must be visible immediately, not serve a
    # response cached from the first.
    2.times do |round|
      days = (0..6).map do |offset|
        {
          date: (week + offset).to_s,
          pos_revenue: offset == 2 ? 3_000 + round : 1_830,
          eatclub_revenue: 0, labour_cost: 0, covers: 10
        }
      end

      put "/api/v1/admin/trading_days",
          params: { venue_id: venue.id, week_start: week.to_s, days: days },
          headers: headers, as: :json

      expect(dashboard_wednesday["current"]["pos_revenue"]).to eq(3_000 + round)
    end
  end
end

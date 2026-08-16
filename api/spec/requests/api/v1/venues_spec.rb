require "rails_helper"

# Walking-skeleton test: proves routing, the controller, ActiveRecord and JSON
# rendering are wired together. Feature endpoints get their own specs.
RSpec.describe "GET /api/v1/venues" do
  it "returns the venues with a count of recorded trading days" do
    venue = create(:venue, name: "Harbourside Kitchen")
    create(:trading_day, venue: venue, date: Date.new(2026, 8, 10))
    create(:trading_day, venue: venue, date: Date.new(2026, 8, 11))

    get "/api/v1/venues"

    expect(response).to have_http_status(:ok)

    body = response.parsed_body
    expect(body["venues"].length).to eq(1)
    expect(body["venues"].first).to include(
      "name" => "Harbourside Kitchen",
      "timezone" => "Australia/Melbourne",
      "trading_days_recorded" => 2
    )
  end
end

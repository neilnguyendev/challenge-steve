# Idempotent seed: safe to run repeatedly.
#
# Creates one venue and three consecutive weeks of trading, ending with the
# current week. Three weeks is the minimum that makes `compare=true` testable
# out of the box — the dashboard needs a week and the week before it, and a
# third gives room to page backwards.

venue = Venue.find_or_create_by!(name: "Harbourside Kitchen") do |v|
  v.timezone = "Australia/Melbourne"
end

# Per-weekday shape: quiet start of week, busy Friday through Sunday.
# Index 0 = Monday.
WEEKDAY_PROFILE = [
  { pos: 1_750, eatclub: 300, labour: 590, covers: 105 }, # Mon
  { pos: 1_800, eatclub: 320, labour: 610, covers: 112 }, # Tue
  { pos: 1_830, eatclub: 340, labour: 780, covers: 118 }, # Wed
  { pos: 1_780, eatclub: 310, labour: 600, covers: 108 }, # Thu
  { pos: 1_900, eatclub: 350, labour: 590, covers: 125 }, # Fri
  { pos: 2_150, eatclub: 400, labour: 800, covers: 145 }, # Sat
  { pos: 2_250, eatclub: 380, labour: 1_100, covers: 158 } # Sun
].freeze

# Older weeks trade slightly below the current one, so week-on-week comparison
# shows a positive delta rather than a flat 0%.
WEEK_SCALE = { 2 => 93, 1 => 96, 0 => 100 }.freeze

current_monday = Date.current.beginning_of_week(:monday)

WEEK_SCALE.each do |weeks_ago, scale|
  monday = current_monday - (weeks_ago * 7)

  WEEKDAY_PROFILE.each_with_index do |profile, offset|
    day = TradingDay.find_or_initialize_by(venue: venue, date: monday + offset)

    day.pos_revenue     = profile[:pos] * scale / 100
    day.eatclub_revenue = profile[:eatclub] * scale / 100
    day.labour_cost     = profile[:labour] * scale / 100
    day.covers          = profile[:covers] * scale / 100
    day.save!
  end
end

admin_email    = ENV.fetch("SEED_ADMIN_EMAIL", "admin@example.com")
admin_password = ENV.fetch("SEED_ADMIN_PASSWORD", "password123")

admin = AdminUser.find_or_initialize_by(email: admin_email)
admin.password = admin_password
admin.save!

puts "Seeded #{Venue.count} venue, #{TradingDay.count} trading days, #{AdminUser.count} admin."
puts "Admin login: #{admin_email} / #{admin_password}"

FactoryBot.define do
  factory :venue do
    sequence(:name) { |n| "Venue #{n}" }
    timezone { "Australia/Melbourne" }
  end
end

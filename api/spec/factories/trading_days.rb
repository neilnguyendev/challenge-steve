FactoryBot.define do
  factory :trading_day do
    venue
    date { Date.current }

    pos_revenue { 1_750 }
    eatclub_revenue { 320 }
    labour_cost { 590 }
    covers { 118 }
  end
end

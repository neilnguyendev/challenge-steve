class Venue < ApplicationRecord
  has_many :trading_days, dependent: :destroy

  validates :name, presence: true
  validates :timezone, presence: true
end

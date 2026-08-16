# A single day of trading at a venue.
#
# All money is whole AUD. total_revenue is derived, never stored.
class TradingDay < ApplicationRecord
  MONEY_COLUMNS = %i[pos_revenue eatclub_revenue labour_cost].freeze

  belongs_to :venue

  validates :date, presence: true, uniqueness: { scope: :venue_id }
  validates(*MONEY_COLUMNS, :covers,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 })

  scope :between, ->(from, to) { where(date: from..to) }
  scope :chronological, -> { order(:date) }

  def total_revenue
    pos_revenue + eatclub_revenue
  end
end

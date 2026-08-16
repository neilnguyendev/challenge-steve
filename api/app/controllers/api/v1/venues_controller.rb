module Api
  module V1
    # Walking-skeleton endpoint. It exists to prove the whole path works —
    # request → controller → ActiveRecord → JSON → browser — and to demonstrate
    # the conventions the real endpoints follow: thin controller, explicit
    # serialisation, no wrapper key on success.
    class VenuesController < BaseController
      def index
        venues = Venue.order(:name).includes(:trading_days)

        render json: { venues: venues.map { |venue| serialize(venue) } }
      end

      private

      def serialize(venue)
        {
          id: venue.id,
          name: venue.name,
          timezone: venue.timezone,
          trading_days_recorded: venue.trading_days.size
        }
      end
    end
  end
end

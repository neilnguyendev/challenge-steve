module Api
  module V1
    # The dashboard's only data source. Public — this is a customer-facing view;
    # authentication applies to /api/v1/admin/* alone.
    class RevenueTrendsController < BaseController
      include WeekParameter

      def show
        render json: RevenueTrendQuery.new(
          venue: venue,
          week_start: week_start,
          compare: compare?
        ).call
      end

      private

      def venue
        return Venue.first || raise_no_venue if params[:venue_id].blank?

        Venue.find_by(id: params[:venue_id]) ||
          raise(ActiveRecord::RecordNotFound, "Venue not found")
      end

      def raise_no_venue
        raise ActiveRecord::RecordNotFound, "No venue configured"
      end

      def compare? = ActiveModel::Type::Boolean.new.cast(params[:compare]).present?
    end
  end
end

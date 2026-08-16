module Api
  module V1
    # The dashboard's only data source. Public — this is a customer-facing view;
    # authentication applies to /api/v1/admin/* alone.
    class RevenueTrendsController < BaseController
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

      # Weeks run Monday to Sunday. Accepting any other start would silently
      # shift every comparison by the same offset, which is worse than refusing.
      def week_start
        return Date.current.beginning_of_week(:monday) if params[:week_start].blank?

        date = begin
          Date.iso8601(params[:week_start])
        rescue Date::Error
          raise InvalidParameter, "week_start must be a valid date in YYYY-MM-DD format"
        end

        raise InvalidParameter, "week_start must be a Monday" unless date.monday?

        date
      end

      def compare? = ActiveModel::Type::Boolean.new.cast(params[:compare]).present?
    end
  end
end

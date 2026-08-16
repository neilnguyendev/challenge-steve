module Api
  module V1
    module Admin
      # Reading and writing a week of figures. Always a whole week, never a
      # single day: the editor shows seven rows, and one bad figure among them
      # should leave the other six as they were.
      class TradingDaysController < BaseController
        include WeekParameter

        DAYS_IN_WEEK = 7
        FIGURES = %i[pos_revenue eatclub_revenue labour_cost covers].freeze

        def index
          render json: { venue_id: venue.id, week_start: monday.to_s, days: week_days }
        end

        def update
          submitted = submitted_days
          reject_dates_outside_the_week!(submitted)

          # One transaction for the week. A failure on Friday must not leave
          # Wednesday's change behind — the manager would have no way to tell.
          ActiveRecord::Base.transaction do
            submitted.each { |attributes| save_day(attributes) }
          end

          render json: { venue_id: venue.id, week_start: monday.to_s, days: week_days }
        end

        private

        def monday = @monday ||= week_start

        def venue
          @venue ||=
            if params[:venue_id].blank?
              Venue.first || raise(ActiveRecord::RecordNotFound, "No venue configured")
            else
              Venue.find_by(id: params[:venue_id]) ||
                raise(ActiveRecord::RecordNotFound, "Venue not found")
            end
        end

        # Seven entries whatever is stored, so the editor always renders a full
        # week and an untraded day is something you can type into.
        def week_days
          recorded = venue.trading_days.between(monday, monday + (DAYS_IN_WEEK - 1))
                          .index_by(&:date)

          (0...DAYS_IN_WEEK).map do |offset|
            date = monday + offset
            day = recorded[date]

            { date: date.to_s, weekday: date.strftime("%a") }
              .merge(FIGURES.index_with { |figure| day ? day.public_send(figure) : 0 })
          end
        end

        def submitted_days
          params.permit(days: [:date, *FIGURES])
                .fetch(:days, [])
                .map { |day| day.to_h.symbolize_keys }
        end

        def reject_dates_outside_the_week!(submitted)
          week = (monday..monday + (DAYS_IN_WEEK - 1)).map(&:to_s)
          stray = submitted.map { |day| day[:date].to_s } - week

          return if stray.empty?

          raise InvalidParameter,
                "these dates fall outside the week beginning #{monday}: #{stray.join(', ')}"
        end

        def save_day(attributes)
          day = venue.trading_days.find_or_initialize_by(date: attributes[:date])
          day.assign_attributes(attributes.slice(*FIGURES))

          return if day.save

          # Name the day as well as the field: "labour cost is negative" is not
          # actionable when seven days are on screen.
          raise InvalidParameter,
                "#{attributes[:date]}: #{day.errors.full_messages.to_sentence}"
        end
      end
    end
  end
end

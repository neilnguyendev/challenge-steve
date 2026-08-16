# Shared reading of the `week_start` query parameter.
#
# Weeks run Monday to Sunday everywhere in this system. Accepting any other
# start would silently shift every comparison by the same offset — worse than
# refusing outright, because the figures would still look plausible.
module WeekParameter
  extend ActiveSupport::Concern

  private

  def week_start(value = params[:week_start])
    return Date.current.beginning_of_week(:monday) if value.blank?

    date = begin
      Date.iso8601(value.to_s)
    rescue Date::Error
      raise Api::V1::BaseController::InvalidParameter,
            "week_start must be a valid date in YYYY-MM-DD format"
    end

    unless date.monday?
      raise Api::V1::BaseController::InvalidParameter, "week_start must be a Monday"
    end

    date
  end
end

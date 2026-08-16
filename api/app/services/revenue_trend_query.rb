# Everything the dashboard shows, computed in one place.
#
# The frontend renders what this returns and calculates nothing, so the summary
# cards and the chart can never disagree about a figure.
class RevenueTrendQuery
  DAYS_IN_WEEK = 7

  # Serialised for both periods under identical keys — the two periods have the
  # same structure, so the payload should too.
  FIGURES = %i[pos_revenue eatclub_revenue labour_cost covers].freeze

  def initialize(venue:, week_start:, compare: false)
    @venue = venue
    @week_start = week_start
    @compare = compare
  end

  def call
    {
      period: period_bounds(week_start),
      previous_period: compare ? period_bounds(previous_start) : nil,
      available_range: available_range,
      summary: summary,
      series: series
    }
  end

  private

  attr_reader :venue, :week_start, :compare

  def week_end = week_start + (DAYS_IN_WEEK - 1)
  def previous_start = week_start - DAYS_IN_WEEK
  def previous_end = week_end - DAYS_IN_WEEK

  def period_bounds(start)
    { start: start.to_s, end: (start + (DAYS_IN_WEEK - 1)).to_s }
  end

  # One query covers both weeks. Fetching them separately would double the
  # round trips to save nothing.
  def days_by_date
    @days_by_date ||= begin
      from = compare ? previous_start : week_start
      venue.trading_days.between(from, week_end).index_by(&:date)
    end
  end

  # Reported whatever week was asked for: the dashboard uses it to stop paging
  # backwards past the earliest week anyone ever recorded.
  def available_range
    @available_range ||= begin
      earliest, latest = venue.trading_days.pick(Arel.sql("MIN(date), MAX(date)"))
      { earliest: earliest&.to_s, latest: latest&.to_s }
    end
  end

  # Build the seven-day skeleton first, then hang whatever was recorded off it.
  # A day with no row falls through as zeros without needing a special case.
  def series
    (0...DAYS_IN_WEEK).map do |offset|
      date = week_start + offset

      {
        date: date.to_s,
        weekday: date.strftime("%a"),
        current: figures_for(date),
        previous: compare ? figures_for(date - DAYS_IN_WEEK) : nil
      }
    end
  end

  # Deliberately excludes total_revenue. Returning the components AND their sum
  # invites a stacked chart to plot all three and draw a bar of double height.
  def figures_for(date)
    day = days_by_date[date]

    FIGURES.index_with { |figure| day ? day.public_send(figure) : 0 }
  end

  def summary
    current = totals_for(week_start..week_end)
    previous = compare ? totals_for(previous_start..previous_end) : nil

    {
      total_revenue: compare_pair(current[:revenue], previous&.fetch(:revenue)),
      average_per_day: compare_pair(
        average(current[:revenue]), previous && average(previous[:revenue])
      ),
      total_covers: compare_pair(current[:covers], previous&.fetch(:covers))
    }
  end

  def totals_for(range)
    days = range.filter_map { |date| days_by_date[date] }

    {
      revenue: days.sum(&:total_revenue),
      covers: days.sum(&:covers)
    }
  end

  # Always seven, never "the number of days that happen to have data" — a quiet
  # week should drag the average down, not be hidden by a smaller divisor.
  def average(total) = (total.to_f / DAYS_IN_WEEK).round

  def compare_pair(current, previous)
    { current: current, previous: previous, delta_pct: delta_pct(current, previous) }
  end

  # The zero guard lives here alone: no caller has to remember it.
  def delta_pct(current, previous)
    return nil if previous.nil? || previous.zero?

    (((current - previous).to_f / previous) * 100).round(1)
  end
end

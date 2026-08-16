Rails.application.routes.draw do
  # Returns 200 once the app has booted cleanly. docker-compose uses this as
  # the api service healthcheck.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :venues, only: :index

      # Singular: one week of one venue, selected by query parameters.
      resource :revenue_trend, only: :show

      namespace :admin do
        post "login", to: "sessions#create"

        # The unit of work is a week, not a day: PUT replaces all seven in one
        # transaction, so a bad figure cannot leave a half-saved week behind.
        get "trading_days", to: "trading_days#index"
        put "trading_days", to: "trading_days#update"
      end
    end
  end
end

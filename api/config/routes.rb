Rails.application.routes.draw do
  # Returns 200 once the app has booted cleanly. docker-compose uses this as
  # the api service healthcheck.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :venues, only: :index

      # Singular: one week of one venue, selected by query parameters.
      resource :revenue_trend, only: :show
    end
  end
end

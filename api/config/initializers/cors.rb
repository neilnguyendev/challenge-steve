# The dashboard is served from a different origin than the API, so the browser
# will not call it without these headers.
#
# CORS_ORIGINS is a comma-separated list, e.g. "http://localhost:3000".
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*ENV.fetch("CORS_ORIGINS", "http://localhost:3000").split(",").map(&:strip))

    resource "*",
             headers: :any,
             expose: %w[Authorization],
             methods: %i[get post patch put delete options head]
  end
end

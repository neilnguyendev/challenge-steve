module Api
  module V1
    module Admin
      # Sign-in. The one admin endpoint that cannot require a token.
      class SessionsController < Api::V1::BaseController
        def create
          admin = AdminUser.find_by(email: params[:email].to_s.strip.downcase)

          if admin&.authenticate(params[:password].to_s)
            render json: {
              token: AdminToken.issue(admin),
              admin: { email: admin.email }
            }
          else
            # Identical for an unknown email and a wrong password, so the
            # response cannot be used to discover which addresses exist.
            render json: { error: "Invalid email or password" }, status: :unauthorized
          end
        end
      end
    end
  end
end

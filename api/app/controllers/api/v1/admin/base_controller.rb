module Api
  module V1
    module Admin
      # Every admin endpoint inherits the guard from here, so no individual
      # controller can forget it.
      class BaseController < Api::V1::BaseController
        before_action :authenticate_admin!

        private

        attr_reader :current_admin

        def authenticate_admin!
          @current_admin = AdminToken.admin_from(bearer_token)

          return if @current_admin

          # One refusal for every reason a token can be untrustworthy — absent,
          # expired, forged. Distinguishing them would tell an attacker which
          # half of the problem to work on.
          render json: { error: "Unauthorized" }, status: :unauthorized
        end

        def bearer_token
          request.headers["Authorization"].to_s[/\ABearer\s+(.+)\z/, 1]
        end
      end
    end
  end
end

module Api
  module V1
    # Shared behaviour for every v1 endpoint.
    #
    # Response shape convention:
    #   success → the resource object at the top level, no wrapper key
    #   failure → { "error": "<human-readable message>" }
    #
    # Controllers raise; this class turns the raise into the right status code,
    # so no endpoint has to hand-roll its own error rendering.
    class BaseController < ApplicationController
      # Raised by controllers for input the client got wrong.
      class InvalidParameter < StandardError; end

      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
      rescue_from InvalidParameter, with: :render_unprocessable

      private

      def render_not_found(error)
        render json: { error: error.message }, status: :not_found
      end

      def render_unprocessable(error)
        render json: { error: error.message }, status: :unprocessable_entity
      end
    end
  end
end

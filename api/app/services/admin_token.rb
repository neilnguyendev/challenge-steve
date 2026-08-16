# Bearer tokens for the admin area.
#
# Nothing is stored server-side: the token carries who it is for and when it
# stops being valid, and the signature is what makes it trustworthy.
class AdminToken
  # Long enough that entering a week of figures never hits the boundary
  # mid-task, short enough to be defensible.
  TTL = 24.hours
  ALGORITHM = "HS256".freeze

  class << self
    def issue(admin_user)
      JWT.encode(
        { sub: admin_user.id, exp: TTL.from_now.to_i },
        secret,
        ALGORITHM
      )
    end

    # Returns the admin, or nil for anything we cannot vouch for: unsigned,
    # signed elsewhere, expired, malformed, or naming an admin who no longer
    # exists. The caller gets one answer to check, not five.
    def admin_from(token)
      return nil if token.blank?

      payload, = JWT.decode(token, secret, true, algorithm: ALGORITHM)
      AdminUser.find_by(id: payload["sub"])
    rescue JWT::DecodeError
      # Covers JWT::ExpiredSignature and JWT::VerificationError, both subclasses.
      nil
    end

    private

    def secret
      ENV.fetch("JWT_SECRET") do
        raise "JWT_SECRET is not set — see .env.example"
      end
    end
  end
end

require "rails_helper"

RSpec.describe "POST /api/v1/admin/login" do
  def body = response.parsed_body

  describe "AS-010: correct credentials return a session token" do
    it "issues a token and names the admin it belongs to" do
      create(:admin_user, email: "admin@example.com", password: "password123")

      post "/api/v1/admin/login",
           params: { email: "admin@example.com", password: "password123" }

      expect(response).to have_http_status(:ok)
      expect(body["token"]).to be_present
      expect(body["admin"]).to eq("email" => "admin@example.com")
    end

    it "accepts the email however it was capitalised or padded" do
      create(:admin_user, email: "admin@example.com", password: "password123")

      post "/api/v1/admin/login",
           params: { email: "  Admin@Example.COM ", password: "password123" }

      expect(response).to have_http_status(:ok)
      expect(body["token"]).to be_present
    end
  end

  describe "AS-011: wrong credentials are refused" do
    it "refuses a wrong password without saying which field was wrong" do
      create(:admin_user, email: "admin@example.com", password: "password123")

      post "/api/v1/admin/login",
           params: { email: "admin@example.com", password: "wrong" }

      expect(response).to have_http_status(:unauthorized)
      expect(body["error"]).to eq("Invalid email or password")
      expect(body).not_to have_key("token")
    end

    it "gives an unknown email the identical refusal" do
      post "/api/v1/admin/login",
           params: { email: "nobody@example.com", password: "password123" }

      expect(response).to have_http_status(:unauthorized)
      expect(body["error"]).to eq("Invalid email or password")
    end

    it "refuses a missing password" do
      create(:admin_user, email: "admin@example.com", password: "password123")

      post "/api/v1/admin/login", params: { email: "admin@example.com" }

      expect(response).to have_http_status(:unauthorized)
      expect(body["error"]).to eq("Invalid email or password")
    end
  end
end

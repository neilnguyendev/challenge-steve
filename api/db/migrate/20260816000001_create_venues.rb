class CreateVenues < ActiveRecord::Migration[7.1]
  def change
    create_table :venues do |t|
      t.string :name, null: false
      t.string :timezone, null: false, default: "Australia/Melbourne"

      t.timestamps
    end
  end
end

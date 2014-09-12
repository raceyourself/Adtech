package bootstrap.liftweb

import net.liftweb.common.{Full, Logback, Logger}
import net.liftweb.http.{Html5Properties, LiftRules, Req}
import net.liftweb.sitemap.{Menu, SiteMap}
import net.liftweb.util.Props
import net.liftweb.mapper._

import java.sql.{Connection, DriverManager}

import underad.dashboard.DBVendor
import underad.dashboard.model._

/**
 * A class that's instantiated early and run.  It allows the application
 * to modify lift's environment
 */
class Boot {
  def boot {
    // where to search snippet
    LiftRules.addToPackages("underad.dashboard")

    // Build SiteMap
    def sitemap(): SiteMap = SiteMap(
      Menu.i("Home") / "index"
    )

    // Use HTML5 for rendering
    LiftRules.htmlProperties.default.set((r: Req) =>
      new Html5Properties(r.userAgent))

    // Database
    DB.defineConnectionManager(DefaultConnectionIdentifier, DBVendor)
    Schemifier.schemify(true, Schemifier.infoF _, DefaultConnectionIdentifier, PublisherMapper)
  }

}
package underad.dashboard

import java.sql._

import net.liftweb.common._
import net.liftweb.mapper._
import net.liftweb.util.Props

object DBVendor extends ConnectionManager {
  // Force load the driver
  Class.forName("org.postgresql.Driver")
  // define methods
  def newConnection(name : ConnectionIdentifier) = {
    try {
      Full(DriverManager.getConnection(
        Props.get("db.url") openOr "jdbc:postgresql:dashboard",
        Props.get("db.user") openOr "defaultuser", Props.get("db.password") openOr "defaultpassword"))
    } catch {
      case e : Exception => e.printStackTrace; Empty
    }
  }
  def releaseConnection (conn : Connection) { conn.close }
}
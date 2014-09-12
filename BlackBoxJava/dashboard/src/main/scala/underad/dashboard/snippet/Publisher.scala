package underad.dashboard.snippet

import net.liftweb._
import net.liftweb.http.S._
import net.liftweb.http.SHtml._
import net.liftweb.http.js.JsCmd
import net.liftweb.http.js.JsCmds._
import net.liftweb.common._
import net.liftweb.mapper._
import util._
import Helpers._
import Mailer._
import scala.xml._

import underad.dashboard.model._

object Publisher extends Logger {

  // Render signup form
  def signup = {
    var name = ""
    var email = ""

    // Process form
    def process(): JsCmd = {
      debug("processing " + name + " <" + email + ">")

      val publisher = PublisherMapper.create.name(name).email(email);
      publisher.save();
      info(publisher + " created");
      sendConfirmation(publisher);

      SetHtml("text", Text("Email queued"))
    }

    "#text *" #> "" &
      "form name=name" #> text(name, name = _) & // Bind input field to variable
      "form name=email" #> text(email, email = _) & // Bind input field to variable
      "form *+" #> hidden(process) // Call process method when submitting
  }

  // Render confirmation page
  def confirmation = {
    param("token") match {
      case Full(token) => {
        // Find publisher by confirmation token
        val box = PublisherMapper.find(By(PublisherMapper.confirmationToken, token))

        box match {
          case Full(publisher) => {
            info("Confirmed " + publisher.name + " <" + publisher.email + ">/" + publisher.id)

            // TODO: Output js snippet
            "head title *" #> "Confirmation succeeded!" &
              "body #content *" #> ("Hello " + publisher.name)
          }
          case _ => {
            "head title *" #> "Confirmation failed!" &
              "body #content *" #> "Invalid confirmation token"
          }
        }
      }
      case _ => {
        redirectTo("/")
      }
    }
  }

  // Send confirmation e-mail to publisher
  def sendConfirmation(publisher : PublisherMapper) {
    val html = <html>
      <head>
        <title>Please confirm your e-mail address</title>
      </head>
      <body>
        <h1>Thank you for signing up for underad analytics</h1>
        Please confirm your e-mail address by clicking the follow link:
        <a>TODO</a>
      </body>
    </html>

    var text = "Thank you for signing up for underad analytics!\n" +
      "\n" +
      "Please confirm your e-mail address by clicking the follow link:\n" +
      "TODO\n"

    Mailer.sendMail(
      From(Props.get("mail.smtp.from", "default@dashboard")),
      Subject("Please confirm your e-mail address"),
      To(publisher.name + "<" + publisher.email + ">"),
      PlainMailBodyType(text),
      XHTMLMailBodyType(html)
    )
  }

}

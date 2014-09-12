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

            val statisticsHost = Props.get("statistics.host", "statistics.example")

            "head title *" #> "Confirmation succeeded!" &
              "body #content *" #> <h1>Thank you for signing up for underad analytics!</h1>
                <p>Insert the following javascript snippet into the HTML of your desired webpage and we will start sending you daily reports:</p>
                <pre><code>
                &lt;script&gt;
                  var script = document.createElement('script')
                  script.src='//{statisticsHost}/hit/{publisher.id}?nocache=' + ~~(Math.random()*999999);
                  document.body.appendChild(script);
                &lt;/script&gt;
              </code></pre>
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
  def sendConfirmation(publisher : PublisherMapper): Unit = {
    val baseUrl = Props.get("publisher.confirmation_url", "http://" + hostName + "/confirmation") // NOTE: default does not support ports
    val confirmationUrl = baseUrl + "?token=" + publisher.confirmationToken;

    val html = <html>
      <head>
        <title>Please confirm your e-mail address</title>
      </head>
      <body>
        <h1>Thank you for signing up for underad analytics</h1>
        <p>
          Please confirm your e-mail address by clicking the follow link:
          <a href={confirmationUrl}>{confirmationUrl}</a>
        </p>
        <small>If you did not request this e-mail, please report the error by replying to this e-mail.</small>
      </body>
    </html>

    var text = "Thank you for signing up for underad analytics!\n" +
      "\n" +
      "Please confirm your e-mail address by clicking the follow link:\n" +
      "  " + confirmationUrl + "\n"

    Mailer.sendMail(
      From(Props.get("mail.smtp.from", "default@dashboard.invalid"), Full(Props.get("mail.smtp.from.name", "Dashboard"))),
      Subject("Please confirm your e-mail address"),
      To(publisher.name + "<" + publisher.email + ">"),
      PlainMailBodyType(text),
      XHTMLMailBodyType(html)
    )
  }

}

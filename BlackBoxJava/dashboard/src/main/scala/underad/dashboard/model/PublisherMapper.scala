package underad.dashboard.model

import java.nio.charset.Charset
import java.security.SecureRandom

import net.liftweb.mapper._
import org.apache.commons.codec.binary.Base64

import scala.util.Random

class PublisherMapper extends LongKeyedMapper[PublisherMapper] with IdPK {
  def getSingleton = PublisherMapper
  object name extends MappedString(this,100)
  object email extends MappedString(this,100)
  object confirmed extends MappedBoolean(this) {
    override def defaultValue = false
  }
  object confirmationToken extends MappedString(this,8*4) {
    override def defaultValue = TokenGenerator.generateToken
  }
}

object PublisherMapper extends PublisherMapper with LongKeyedMetaMapper[PublisherMapper] {
  override def fieldOrder = List(email)
}

object TokenGenerator {

  val TOKEN_LENGTH = 32
  val TOKEN_CHARS =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._"
  val secureRandom = new SecureRandom()

  def generateToken:String =
    generateToken(TOKEN_LENGTH)

  def generateToken(tokenLength: Int): String =
    if(tokenLength == 0) "" else TOKEN_CHARS(secureRandom.nextInt(TOKEN_CHARS.length())) +
      generateToken(tokenLength - 1)

}
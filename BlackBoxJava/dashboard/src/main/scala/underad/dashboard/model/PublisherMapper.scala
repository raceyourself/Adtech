package underad.dashboard.model

import java.nio.charset.Charset

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
    override def defaultValue = Base64.encodeBase64URLSafeString(Random.nextString(8).getBytes(Charset.defaultCharset()))
  }
}

object PublisherMapper extends PublisherMapper with LongKeyedMetaMapper[PublisherMapper] {
  override def fieldOrder = List(email)
}
package underad.blackbox.jdbi;

import org.joda.time.DateTime;
import org.skife.jdbi.v2.sqlobject.Bind;
import org.skife.jdbi.v2.sqlobject.SqlQuery;

public interface PublisherPasswordDao {
	/**
	 * Retrieves an appropriate key for a given host.
	 * 
	 * @param host The publisher's host, e.g. nytimes.com.
	 * @param publisherTs Publisher app server date/time at the point of generating the page that includes the adverts
	 * we're attempting to augment. Publisher must provide this when calling <code>JsIncludeResource</code> to avoid
	 * edge condition when keys are switched over.
	 * @return The crypto password to be used.
	 */
	@SqlQuery(
		"select password\n" +
		"from publisher_passwords\n" +
		"inner join\n" +
		" (\n" +
		"  select publisher_id, max(effective) maxeffective from publisher_passwords\n" +
		"  where effective < :publisher_ts\n" +
		"  group by publisher_id\n" +
		") past_publisher_passwords\n" +
		"on publisher_passwords.publisher_id = past_publisher_passwords.publisher_id\n" +
		"and publisher_passwords.effective = past_publisher_passwords.maxeffective\n" +
		"inner join\n" +
		"publisher_hosts hosts\n" +
		"on hosts.publisher_id = publisher_passwords.publisher_id\n" +
		"where :host like hosts.host")
	String getPassword(@Bind("host") String host, @Bind("publisher_ts") DateTime publisherTs);
}

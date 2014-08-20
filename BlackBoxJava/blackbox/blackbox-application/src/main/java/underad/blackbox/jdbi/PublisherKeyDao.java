package underad.blackbox.jdbi;

import org.joda.time.DateTime;
import org.skife.jdbi.v2.sqlobject.Bind;
import org.skife.jdbi.v2.sqlobject.SqlQuery;

public interface PublisherKeyDao {
	/**
	 * Retrieves an appropriate key for a given host.
	 * 
	 * @param host The publisher's host, e.g. nytimes.com.
	 * @param publisherTs Publisher app server date/time at the point of generating the page that includes the adverts
	 * we're attempting to augment. Publisher must provide this when calling <code>JsIncludeResource</code> to avoid
	 * edge condition when keys are switched over.
	 * @return The key to be used.
	 */
	@SqlQuery(
		"select key\n" +
		"from publisher_keys\n" +
		"inner join\n" +
		" (\n" +
		"  select publisher_id, max(effective) maxeffective from publisher_keys\n" +
		"  where publisher_id = :publisher_id\n" +
		"  and effective < :publisher_ts\n" +
		"  group by publisher_id\n" +
		") past_publisher_keys\n" +
		"on publisher_keys.publisher_id = past_publisher_keys.publisher_id\n" +
		"and publisher_keys.effective = past_publisher_keys.maxeffective" +
		"inner join\n" +
		"domains\n" +
		"on hosts.publisher_id = publisher_keys.publisher_id\n" +
		"where hosts.host = :host")
	String getKey(@Bind("host") String host, @Bind("publisher_ts") DateTime publisherTs);
}

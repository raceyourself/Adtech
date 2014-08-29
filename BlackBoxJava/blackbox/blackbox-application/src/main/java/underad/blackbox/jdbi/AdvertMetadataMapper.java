package underad.blackbox.jdbi;

import java.sql.ResultSet;
import java.sql.SQLException;

import org.skife.jdbi.v2.StatementContext;
import org.skife.jdbi.v2.tweak.ResultSetMapper;

import underad.blackbox.core.AdvertMetadata;

public class AdvertMetadataMapper implements ResultSetMapper<AdvertMetadata> {
	public AdvertMetadata map(int index, ResultSet r, StatementContext ctx) throws SQLException {
		return new AdvertMetadata(
			r.getLong("id"),
			r.getString("blocked_abs_xpath"),
			r.getString("advert_rel_xpath"),
			r.getString("width_with_unit"),
			r.getString("height_with_unit")
		);
	}
}

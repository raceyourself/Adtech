package underad.blackbox.core.util;

import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

public class CryptoTest extends TestCase {
    public CryptoTest(String testName) {
        super(testName);
    }

    public static Test suite() {
        return new TestSuite(CryptoTest.class);
    }

    public void testCryptoCycle() {
    	String pass = "oink_";
    	long ts = System.currentTimeMillis();
        String original = "zebra";
    	
    	String ciphertext = Crypto.encrypt(pass, ts, original);
        String plaintext = Crypto.decrypt(pass, ts, ciphertext);
        
        assertEquals(original, plaintext);
    }
}

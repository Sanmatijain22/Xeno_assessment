import pandera.polars as pa
import polars as pl

# Test 1: basic schema with native python types
s = pa.DataFrameSchema({
    'order_id': pa.Column(str, nullable=False),
    'quantity': pa.Column(int, checks=pa.Check.greater_than_or_equal_to(0)),
    'amount': pa.Column(float, checks=pa.Check.greater_than_or_equal_to(0.0)),
    'phone_number': pa.Column(str, checks=pa.Check.str_matches(r'^\+?\d{7,15}$'), nullable=False),
    'payment_mode': pa.Column(str, checks=pa.Check.isin(['UPI', 'Credit Card']), nullable=False),
    'transaction_date': pa.Column(str, nullable=False),
})
print("Schema builds OK")

# Test 2: validate a small dataframe
df = pl.DataFrame({
    'order_id': ['ORD1'],
    'quantity': [2],
    'amount': [100.0],
    'phone_number': ['+919876543210'],
    'payment_mode': ['UPI'],
    'transaction_date': ['01/01/2024'],
})
result = s.validate(df)
print(f"Validation OK: {result.shape}")
